import {
  AbortedState,
  AbortFn,
  ErrorState,
  InitialState,
  Producer,
  ProducerProps,
  ProducerWrapperInput,
  RunIndicators,
  State,
  StateFunctionUpdater,
  Status,
  SuccessState,
  unstable_StateBuilder as StateBuilder,
  unstable_producerWrapper as producerWrapper,
  unstable_defaultEffectsCreator as defaultEffectsCreator,
  ProducerSavedProps,
} from "react-async-states";
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

  // @ts-ignore
  let initialState: InitialState<T> = StateBuilder.initial(config.initialValue);
  let state: State<T, E, R> = initialState;
  let suspender;

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
    setProducerType: noop,
    getState: () => state,
    getProducer: () => config.producer,
    setSuspender: (p: Promise<T>) => suspender = p,
    replaceState: (newState) => state = newState,
  }

  let realProducer = producerWrapper.bind(null, input);
  let runIndicators = {cleared: false, aborted: false, fulfilled: false};

  let producerProps: ProducerProps<T, E, R> = constructPropsObject(
    initialState,
    onAborted,
    runIndicators,
    clonedPayload,
    config.args || [],
  );

  function onAborted(a: AbortedState<T, E, R>) {
    state = a;
    config.onAborted?.(a);
    config.onFulfillment?.(a);
  }

  realProducer(producerProps, runIndicators, {
    onAborted,
    onSuccess(s: SuccessState<T>) {
      state = s;
      config.onSuccess?.(s);
      config.onFulfillment?.(s);
    },
    onError(e: ErrorState<T, E>) {
      state = e;
      config.onError?.(e);
      config.onFulfillment?.(e);
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
    getState() {
      throw new Error("Top level runc producer props shouldn't use getState().");
    }
  };
  Object.assign(props, defaultEffectsCreator(props));

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

function shallowClone<T extends Object>(obj: T): T {
  return Object.assign({}, obj);
}

export function cloneProducerProps<T, E, R>(props: ProducerProps<T, E, R>): ProducerSavedProps<T> {
  const output = {
    lastSuccess: shallowClone(props.lastSuccess),
    payload: props.payload,
    args: props.args,
  } as ProducerSavedProps<T>;

  delete output.lastSuccess!.props;

  return output;
}
