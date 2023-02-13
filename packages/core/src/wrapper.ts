import {
  AbortFn,
  ProducerCallbacks,
  ProducerProps,
  ProducerWrapperInput,
  RetryConfig,
  RunIndicators
} from "./types";
import {
  __DEV__,
  cloneProducerProps,
  isFunction,
  isGenerator,
  isPromise
} from "./utils";
import devtools from "./devtools/Devtools";
import {StateBuilder} from "./helpers/StateBuilder";

export function producerWrapper<T, E = any, R = any>(
  input: ProducerWrapperInput<T, E, R>,
  props: ProducerProps<T, E, R>,
  indicators: RunIndicators,
  callbacks?: ProducerCallbacks<T, E, R>,
): AbortFn {
  let {instance,} = input;
  let currentProducer = input.getProducer();

  if (!isFunction(currentProducer)) {
    indicators.fulfilled = true;
    input.setState(props.args[0], props.args[1], callbacks);
    return;
  }

  let pendingPromise;
  let executionValue;
  let savedProps = cloneProducerProps(props);

  try {
    executionValue = currentProducer(props);
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
    if (__DEV__ && instance) devtools.emitRunSync(instance, savedProps);
    onFail(e);
    return;
  }

  if (isGenerator<T>(executionValue)) {
    if (__DEV__ && instance) devtools.emitRunGenerator(instance, savedProps);
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
      input.setSuspender(pendingPromise);
      input.replaceState(StateBuilder.pending(savedProps), true, callbacks);
    }
  } else if (isPromise(executionValue)) {
    if (__DEV__ && instance) devtools.emitRunPromise(instance, savedProps);
    pendingPromise = executionValue;
    input.setSuspender(pendingPromise);
    input.replaceState(StateBuilder.pending(savedProps), true, callbacks);
  } else { // final value
    if (__DEV__ && instance) devtools.emitRunSync(instance, savedProps);
    onSuccess(executionValue);
    return;
  }

  pendingPromise.then(onSuccess, onFail);

  function onSuccess(data: T) {
    if (!indicators.aborted) {
      indicators.fulfilled = true;
      let successState = StateBuilder.success(data, savedProps);
      input.replaceState(successState, true, callbacks);
    }
  }

  function onFail(error: E) {
    if (!indicators.aborted) {
      let retryConfig = instance?.config.retryConfig;
      if (retryConfig && retryConfig.enabled) {
        if (shouldRetry(indicators.attempt, retryConfig, error)) {
          let backoff = getRetryBackoff(indicators.attempt, retryConfig, error);
          indicators.attempt += 1;

          if (isFunction(setTimeout)) {
            let id = setTimeout(() => {
              producerWrapper(input, props, indicators, callbacks);
            }, backoff);

            props.onAbort(() => {
              clearTimeout(id);
            });
          } else {
            producerWrapper(input, props, indicators, callbacks);
          }
          return;
        }
      }

      indicators.fulfilled = true;
      let errorState = StateBuilder.error<T, E>(error, savedProps);
      input.replaceState(errorState, true, callbacks);
    }
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
    shouldRetry = (retry as (attemptIndex:number, error: E) => boolean)(attempt, error);
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
    return (backoff as (attemptIndex:number, error: E) => number)(attempt, error);
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
