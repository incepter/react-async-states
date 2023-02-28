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

type RuncConfig<T, E = unknown, R = unknown, A extends unknown[] = unknown[]> = {
  context?: any,
  initialValue?: T,
  producer: Producer<T, E, R, A>,
  retryConfig?: RetryConfig<T, E, R, A>,

  onError?(e: ErrorState<T, E, A>),
  onSuccess?(s: SuccessState<T, A>),
  onAborted?(a: AbortedState<T, E, R, A>),
  onFulfillment?(a: State<T, E, R, A>), // called always

  args?: A,
  payload?: Record<string, unknown>,
}

export function runc<T, E = unknown, R = unknown, A extends unknown[] = unknown[]>(config: RuncConfig<T, E, R, A>): AbortFn<R> {
  let context = requestContext(config.context);
  let {producer, retryConfig, payload, args} = config;
  let initialState = StateBuilder.initial<T, A>(config.initialValue as T);

  let state: State<T, E, R, A> = initialState;
  let indicators = {cleared: false, aborted: false, done: false, index: 1};

  let props = createProps(
    {
      context,
      args: (args || []) as A,
      payload: (payload || {}),

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
    state = StateBuilder.aborted<T, E, R, A>(reason, cloneProducerProps(props));
    config.onAborted?.(state);
    config.onFulfillment?.(state);

  }
  function onSettled(
    data: T | E,
    status: Status.success | Status.error,
    savedProps: ProducerSavedProps<T, A>,
  ) {
    state = Object.freeze(
      {status, data, props: savedProps, timestamp: Date.now()} as
        (SuccessState<T, A> | ErrorState<T, E, A>)
    );
    if (state.status === Status.success) {
      onSuccess(state);
    }
    if (state.status === Status.error) {
      onError(state);
    }
  }
  function onSuccess(s: SuccessState<T, A>) {
    state = s;
    config.onSuccess?.(state);
    config.onFulfillment?.(state);
  }
  function onError(e: ErrorState<T, E, A>) {
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

export function cloneProducerProps<T, E, R, A extends unknown[]>(props: ProducerProps<T, E, R, A>): ProducerSavedProps<T, A> {
  return {
    payload: props.payload,
    args: props.args,
  } as ProducerSavedProps<T, A>;
}
