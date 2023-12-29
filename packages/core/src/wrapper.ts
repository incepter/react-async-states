import {
  OnSettled,
  Producer,
  ProducerCallbacks,
  ProducerProps,
  RetryConfig,
  RunIndicators,
} from "./types";
import {
  cloneProducerProps,
  isFunction,
  isGenerator,
  isPromise,
} from "./utils";
import { error as errorStatus, success } from "./enums";

export function run<TData, TArgs extends unknown[], TError>(
  producer: Producer<TData, TArgs, TError>,
  props: ProducerProps<TData, TArgs, TError>,
  indicators: RunIndicators,
  onSettled: OnSettled<TData, TArgs, TError>,
  retryConfig?: RetryConfig<TData, TArgs, TError>,
  callbacks?: ProducerCallbacks<TData, TArgs, TError>
): Promise<TData> | undefined {
  let pendingPromise: Promise<TData>;
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
    onFail(e as TError);
    return;
  }

  if (isGenerator<TData>(executionValue)) {
    let generatorResult;
    try {
      // generatorResult is either {done: boolean, value: TData} or a Promise<TData>
      generatorResult = stepGenerator(executionValue, props, indicators);
    } catch (e) {
      onFail(e as TError);
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
  } else {
    // final value
    onSuccess(executionValue);
    return;
  }

  // @ts-ignore
  return pendingPromise.then(onSuccess, onFail);

  function onSuccess(data: TData): TData {
    if (!indicators.aborted) {
      indicators.done = true;
      onSettled(data, success, cloneProducerProps(props), callbacks);
    }
    return data;
  }

  function onFail(error: TError) {
    if (indicators.aborted) {
      return;
    }
    if (
      retryConfig &&
      retryConfig.enabled &&
      shouldRetry(indicators.index, retryConfig, error)
    ) {
      let backoff = getRetryBackoff(indicators.index, retryConfig, error);
      indicators.index += 1;

      let id = setTimeout(() => {
        run(producer, props, indicators, onSettled, retryConfig, callbacks);
      }, backoff);

      props.onAbort(() => {
        clearTimeout(id);
      });
      return;
    }

    indicators.done = true;
    onSettled(error, errorStatus, cloneProducerProps(props), callbacks);
  }
}

function shouldRetry<TData, TArgs extends unknown[], TError>(
  attempt: number,
  retryConfig: RetryConfig<TData, TArgs, TError>,
  error: TError
): boolean {
  let { retry, maxAttempts } = retryConfig;
  let canRetry = !!maxAttempts && attempt <= maxAttempts;
  let shouldRetry: boolean = retry === undefined ? true : !!retry;
  if (isFunction(retry)) {
    shouldRetry = retry(attempt, error);
  }

  return canRetry && shouldRetry;
}

function getRetryBackoff<TData, TArgs extends unknown[], TError>(
  attempt: number,
  retryConfig: RetryConfig<TData, TArgs, TError>,
  error: TError
): number {
  let { backoff } = retryConfig;
  if (isFunction(backoff)) {
    return (backoff as (attemptIndex: number, error: TError) => number)(
      attempt,
      error
    );
  }
  return (backoff as number) || 0;
}

function stepGenerator<TData>(
  generatorInstance: Generator<any, TData, any>,
  props,
  indicators
): { done: true; value: TData } | Promise<TData> {
  let generator = generatorInstance.next();

  while (!generator.done && !isPromise(generator.value)) {
    generator = generatorInstance.next(generator.value);
  }

  if (generator.done) {
    return { done: true, value: generator.value };
  } else {
    return new Promise(function stepIntoGenerator(resolve, reject) {
      const abortGenerator = stepInAsyncGenerator(
        generatorInstance,
        generator,
        resolve,
        reject
      );

      function abortFn() {
        if (!indicators.done && !indicators.aborted) {
          abortGenerator();
        }
      }

      props.onAbort(abortFn);
    });
  }
}

function stepInAsyncGenerator(generatorInstance, generator, onDone, onReject) {
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
    Promise.resolve(generator.value).then(onGeneratorResolve, onGeneratorCatch);
  }

  return function abort() {
    aborted = true;
  };
}
