import {
  AbortedState,
  AbortFn,
  createProps,
  ErrorState,
  Producer,
  ProducerProps,
  ProducerSavedProps,
  requestContext,
  RetryConfig,
  runner,
  State,
  StateBuilder,
  Status,
  SuccessState
} from "async-states";

type RuncConfig<T, E = any, R = any> = {
  context?: any,
  initialValue?: T,
  producer: Producer<T, E, R>,
  retryConfig?: RetryConfig<T, E, R>,

  onError?(e: ErrorState<T, E>),
  onSuccess?(s: SuccessState<T>),
  onAborted?(a: AbortedState<T, E, R>),
  onFulfillment?(a: State<T, E, R>), // called always

  args?: any[],
  payload?: Record<string, any>,
}

export function runc<T, E = any, R = any>(config: RuncConfig<T, E, R>): AbortFn {
  let context = requestContext(config.context);
  let {producer, retryConfig, payload, args} = config;
  let initialState = StateBuilder.initial(config.initialValue as T);

  let state: State<T, E, R> = initialState;
  let indicators = {cleared: false, aborted: false, done: false, index: 1};

  let props = createProps(
    {
      context,
      payload,
      args: args || [],

      onAborted,
      onCleared() {},
      getState: () => state,
      indicators: indicators,
      lastSuccess: initialState,
      onEmit() {
        throw new Error("Emit isn't supported with top level runc.");
      },
    }
  );
  function onAborted(reason: R) {
    state = StateBuilder.aborted<T, E, R>(reason, cloneProducerProps(props));
    config.onAborted?.(state);
    config.onFulfillment?.(state);

  }
  function onSettled(
    data: T | E,
    status: Status.success | Status.error,
    savedProps: ProducerSavedProps<T>,
  ) {
    state = Object.freeze(
      {status, data, props: savedProps, timestamp: Date.now()} as
        (SuccessState<T> | ErrorState<T, E>)
    );
    if (state.status === Status.success) {
      onSuccess(state);
    }
    if (state.status === Status.error) {
      onError(state);
    }
  }
  function onSuccess(s: SuccessState<T>) {
    state = s;
    config.onSuccess?.(state);
    config.onFulfillment?.(state);
  }
  function onError(e: ErrorState<T, E>) {
    state = e;
    config.onError?.(state);
    config.onFulfillment?.(state);
  }
  runner(
    producer,
    props,
    indicators,
    onSettled,
    retryConfig
  )

  return props.abort;
}

export function cloneProducerProps<T, E, R>(props: ProducerProps<T, E, R>): ProducerSavedProps<T> {
  return {
    payload: props.payload,
    args: props.args,
  } as ProducerSavedProps<T>;
}
