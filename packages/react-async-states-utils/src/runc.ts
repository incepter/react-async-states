import {
  AbortedState,
  AbortFn,
  ErrorState,
  InitialState,
  Producer,
  ProducerProps,
  ProducerSavedProps,
  RunIndicators,
  State,
  SuccessState,
} from "react-async-states";
import {
  RetryConfig,
  runner,
  StateBuilder,
  LibraryPoolsContext,
  ProducerCallbacks,
  requestContext,
  runFunction,
  runpFunction,
  selectFunction,
  Status
} from "async-states";
import {isFunction} from "./utils";

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
  let clonedPayload = Object.assign({}, payload);
  let runIndicators = {cleared: false, aborted: false, done: false, index: 1};

  let producerProps: ProducerProps<T, E, R> = constructPropsObject(
    context,
    initialState,
    onAborted,
    runIndicators,
    clonedPayload,
    args || [],
  );

  function onAborted(a: AbortedState<T, E, R>) {
    state = a;
    config.onAborted?.(state);
    config.onFulfillment?.(state);
  }

  runner(
    producer,
    producerProps,
    runIndicators,
    function onSettled(
      data: T | E,
      status: Status.success | Status.error,
      savedProps: ProducerSavedProps<T>,
      callbacks?: ProducerCallbacks<T, E, R>
    ) {
      if (savedProps === null) {
        // this means there were no producer at all, and this is an imperative update
        // @ts-ignore need to overload setState to accept E and R too with their statuses
        instance.setState(data, status, callbacks);
        return;
      }
      state = Object.freeze(
        {status, data, props: savedProps, timestamp: Date.now()} as
          (SuccessState<T> | ErrorState<T, E>)
      )
    },
    retryConfig,
    {
      onAborted,
      onSuccess(s: SuccessState<T>) {
        state = s;
        config.onSuccess?.(state);
        config.onFulfillment?.(state);
      },
      onError(e: ErrorState<T, E>) {
        state = e;
        config.onError?.(state);
        config.onFulfillment?.(state);
      },
    }
  )

  return producerProps.abort;
}

function constructPropsObject<T, E, R>(
  context: LibraryPoolsContext,
  initialState: InitialState<T>,
  onAborted: (abortedState: AbortedState<T, E, R>) => void,
  runIndicators: RunIndicators,
  payload: Record<string, any> | null | undefined,
  args: any[]
): ProducerProps<T, E, R> {
  let onAbortCallbacks: AbortFn[] = [];
  // @ts-ignore
  let props: ProducerProps<T> = {
    emit,
    args,
    abort,
    payload,
    get lastSuccess(): SuccessState<T> | InitialState<T> {
      return initialState;
    },
    onAbort(cb: AbortFn) {
      if (isFunction(cb)) {
        onAbortCallbacks.push(cb);
      }
    },
    isAborted() {
      return runIndicators.aborted;
    },

    run: runFunction.bind(null, context),
    runp: runpFunction.bind(null, context),
    select: selectFunction.bind(null, context),
  };

  return props;

  function emit(): void {
    throw new Error("Emit isn't supported with top level runc.");
  }

  function abort(reason: any): AbortFn | undefined {
    if (runIndicators.aborted || runIndicators.cleared) {
      return;
    }

    if (!runIndicators.done) {
      runIndicators.aborted = true;
      let abortedState = StateBuilder.aborted<T, E, R>(reason, cloneProducerProps(props));
      onAborted(abortedState);
    }

    runIndicators.cleared = true;
    onAbortCallbacks.forEach(function clean(func) {

      if (isFunction(func)) {
        func(reason);
      }
    });
  }
}

export function cloneProducerProps<T, E, R>(props: ProducerProps<T, E, R>): ProducerSavedProps<T> {
  return {
    payload: props.payload,
    args: props.args,
  } as ProducerSavedProps<T>;
}
