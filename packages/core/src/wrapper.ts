import {
  AbortFn, ErrorState, Producer,
  ProducerCallbacks,
  ProducerProps, ProducerSavedProps,
  ProducerWrapperInput,
  RetryConfig,
  RunIndicators, SuccessState
} from "./types";
import {
  cloneProducerProps,
  isFunction,
  isGenerator,
  isPromise
} from "./utils";
import {StateBuilder} from "./helpers/StateBuilder";
import {Status, success, error as errorStatus} from "./enums";
import {freeze, now} from "./helpers/corejs";

type OnSettled<T, E, R> = {
  (
    data: T, status: Status.success, savedProps: ProducerSavedProps<T> | null,
    callbacks?: ProducerCallbacks<T, E, R>
  ): void,
  (
    data: E, status: Status.error, savedProps: ProducerSavedProps<T> | null,
    callbacks?: ProducerCallbacks<T, E, R>
  ): void,
}

function producerRunner<T, E, R>(
  producer: Producer<T, E, R> | null | undefined,
  props: ProducerProps<T, E, R>,
  indicators: RunIndicators,
  onSettled: OnSettled<T, E, R>,
  retryConfig?: RetryConfig<T, E, R>,
  callbacks?: ProducerCallbacks<T, E, R>,
): Promise<T> | undefined {

  if (!isFunction(producer)) {
    indicators.fulfilled = true;
    onSettled(props.args[0], props.args[1], null, callbacks);
    return;
  }

  let pendingPromise: Promise<T>;
  let executionValue;

  try {
    executionValue = producer(props);
    // when producer runs, it can decide to bailout everything
    // by calling props.abort(reason?) as early as possible
    if (indicators.aborted) {
      return;
    }
  } catch (e) {
    // same, you can props.abort(); throw "Ignored error";
    if (indicators.aborted) {
      return;
    }
    onFail(e);
    return;
  }

  if (isGenerator<T>(executionValue)) {
    let generatorResult;
    try {
      // generatorResult is either {done: boolean, value: T} or a Promise<T>
      generatorResult = stepGenerator(executionValue, props, indicators);
    } catch (e) {
      onFail(e);
      return;
    }
    if (generatorResult.done) {
      onSuccess(generatorResult.value);
      return;
    } else {
      pendingPromise = generatorResult;
    }
  } else if (isPromise(executionValue)) {
    pendingPromise = executionValue;
  } else { // final value
    onSuccess(executionValue);
    return;
  }

  // @ts-ignore
  return pendingPromise.then(onSuccess, onFail);

  function onSuccess(data: T): T {
    if (!indicators.aborted) {
      indicators.fulfilled = true;
      onSettled(data, success, cloneProducerProps(props), callbacks);
    }
    return data;
  }

  function onFail(error: E) {
    if (indicators.aborted) {
      return;
    }
    if (
      retryConfig && retryConfig.enabled &&
      shouldRetry(indicators.attempt, retryConfig, error)
    ) {
      let backoff = getRetryBackoff(indicators.attempt, retryConfig, error);
      indicators.attempt += 1;

      let id = setTimeout(() => {
        producerRunner(producer, props, indicators, onSettled, retryConfig, callbacks);
      }, backoff);

      props.onAbort(() => {
        clearTimeout(id);
      });
      return;
    }

    indicators.fulfilled = true;
    onSettled(error, errorStatus, cloneProducerProps(props), callbacks);
  }
}


export function producerWrapper<T, E = any, R = any>(
  input: ProducerWrapperInput<T, E, R>,
  props: ProducerProps<T, E, R>,
  indicators: RunIndicators,
  callbacks?: ProducerCallbacks<T, E, R>,
) {
  let {instance, getProducer, setState, replaceState, setSuspender} = input;

  function onSettled(
    data: T | E,
    status: Status.success | Status.error,
    savedProps: ProducerSavedProps<T> | null,
    callbacks?: ProducerCallbacks<T, E, R>
  ) {
    if (savedProps === null) {
      // this means there were no producer at all, and this is an imperative update
      // @ts-ignore
      setState(data, status, callbacks);
      return;
    }

    let state = freeze(
      {status, data, props: savedProps, timestamp: now()} as
        (SuccessState<T> | ErrorState<T, E>)
    );

    replaceState(state, true, callbacks);
  }

  let result = producerRunner(
    getProducer(),
    props,
    indicators,
    onSettled,
    instance?.config.retryConfig,
    callbacks,
  );

  // not undefined means the request was asynchronous!
  if (result !== undefined) {
    setSuspender(result)
    let pendingState = StateBuilder.pending(cloneProducerProps(props))
    replaceState(pendingState, true, callbacks)
  }
}

function shouldRetry<T, E, R>(
  attempt: number,
  retryConfig: RetryConfig<T, E, R>,
  error: E
): boolean {
  let {retry, maxAttempts} = retryConfig;
  let canRetry = !!maxAttempts && attempt <= maxAttempts;
  let shouldRetry: boolean = retry === undefined ? true : !!retry;
  if (isFunction(retry)) {
    shouldRetry = retry(attempt, error);
  }

  return canRetry && shouldRetry;
}

function getRetryBackoff<T, E, R>(
  attempt: number,
  retryConfig: RetryConfig<T, E, R>,
  error: E
): number {
  let {backoff} = retryConfig;
  if (isFunction(backoff)) {
    return (backoff as (
      attemptIndex: number, error: E) => number)(attempt, error);
  }
  return (backoff as number) || 0;
}

function stepGenerator<T>(
  generatorInstance: Generator<any, T, any>,
  props,
  indicators
): { done: true, value: T } | Promise<T> {
  let generator = generatorInstance.next();

  while (!generator.done && !isPromise(generator.value)) {
    generator = generatorInstance.next(generator.value);
  }

  if (generator.done) {
    return {done: true, value: generator.value};
  } else {
    return new Promise(function stepIntoGenerator(resolve, reject) {
      const abortGenerator = stepInAsyncGenerator(
        generatorInstance,
        generator,
        resolve,
        reject
      );

      function abortFn() {
        if (!indicators.fulfilled && !indicators.aborted) {
          abortGenerator();
        }
      }

      props.onAbort(abortFn);
    });
  }
}

function stepInAsyncGenerator(
  generatorInstance,
  generator,
  onDone,
  onReject
) {
  let aborted = false;

  // we enter here only if startupValue is pending promise of the generator instance!
  generator.value.then(step, onGeneratorCatch);

  function onGeneratorResolve(resolveValue) {
    if (aborted) {
      return;
    }
    if (!generator.done) {
      step();
    } else {
      onDone(resolveValue);
    }
  }

  function onGeneratorCatch(e) {
    if (aborted) {
      return;
    }
    if (generator.done) {
      onDone(e);
    } else {
      try {
        generator = generatorInstance.throw(e);
      } catch (newException) {
        onReject(newException);
      }
      if (generator.done) {
        onDone(generator.value);
      } else {
        step();
      }
    }
  }

  function step() {
    if (aborted) {
      return;
    }
    try {
      generator = generatorInstance.next(generator.value);
    } catch (e) {
      onGeneratorCatch(e);
    }
    Promise
      .resolve(generator.value)
      .then(onGeneratorResolve, onGeneratorCatch)
  }

  return function abort() {
    aborted = true;
  }
}
