import {
  AbortedState,
  AbortFn,
  ErrorState,
  InitialState,
  Producer,
  ProducerProps,
  ProducerSavedProps,
  ProducerWrapperInput,
  RunIndicators,
  State,
  StateFunctionUpdater,
  Status,
  SuccessState,
} from "react-async-states";
import {effectsCreator, producerWrapper, StateBuilder} from "async-states";
import {isFunction, noop} from "./utils";

type RuncConfig<T, E = any, R = any> = {
  initialValue?: T,
  producer: Producer<T, E, R> | null | undefined,

  onError?(e: ErrorState<T, E>),
  onSuccess?(s: SuccessState<T>),
  onAborted?(a: AbortedState<T, E, R>),
  onFulfillment?(a: State<T, E, R>), // called always

  args?: any[],
  payload?: Record<string, any>,
}

export function runc<T, E = any, R = any>(config: RuncConfig<T, E, R>): AbortFn {
  let initialState = StateBuilder.initial(config.initialValue as T);
  let state: State<T, E, R> = initialState;

  let clonedPayload = Object.assign({}, config.payload);
  let input: ProducerWrapperInput<T, E, R> = {
    instance: undefined,
    setState(
      updater: StateFunctionUpdater<T, E, R> | T,
      status: Status = Status.success,
    ): void {
      let effectiveValue = updater;
      if (isFunction(updater)) {
        effectiveValue = (updater as StateFunctionUpdater<T, E, R>)(this.state);
      }
      // @ts-ignore
      const savedProps = cloneProducerProps({
        args: [effectiveValue],
        payload: clonedPayload,
      });
      // @ts-ignore
      state = StateBuilder[status](effectiveValue, savedProps);
    },
    setSuspender: noop,
    getProducer: () => config.producer,
    replaceState: (newState) => state = newState,
  }

  let realProducer = producerWrapper.bind(null, input);
  let runIndicators = {cleared: false, aborted: false, fulfilled: false, attempt: 1};

  let producerProps: ProducerProps<T, E, R> = constructPropsObject(
    initialState,
    onAborted,
    runIndicators,
    clonedPayload,
    config.args || [],
  );

  function onAborted(a: AbortedState<T, E, R>) {
    state = a;
    config.onAborted?.(state);
    config.onFulfillment?.(state);
  }

  realProducer(producerProps, runIndicators, {
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
  });

  return producerProps.abort;
}

function constructPropsObject<T, E, R>(
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
  };
  Object.assign(props, effectsCreator(props));

  return props;

  function emit(): void {
    throw new Error("Emit isn't supported with top level runc.");
  }

  function abort(reason: any): AbortFn | undefined {
    if (runIndicators.aborted || runIndicators.cleared) {
      return;
    }

    if (!runIndicators.fulfilled) {
      runIndicators.aborted = true;
      let abortedState = StateBuilder.aborted<T, E, R>(reason, cloneProducerProps(props));
      onAborted(abortedState);
    }

    runIndicators.cleared = true;
    onAbortCallbacks.forEach(function clean(func) {

      if (isFunction(func)) {
        func!(reason);
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
