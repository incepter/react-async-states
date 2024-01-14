import {
  OnSettled,
  Producer,
  ProducerCallbacks,
  ProducerProps,
  RetryConfig,
  RunIndicators,
  PromiseLike,
} from "./types";
import { cloneProducerProps, isFunction, isPromise } from "./utils";
import { error as errorStatus, success } from "./enums";

export function run<TData, TArgs extends unknown[], TError>(
  producer: Producer<TData, TArgs, TError>,
  props: ProducerProps<TData, TArgs, TError>,
  indicators: RunIndicators,
  onSettled: OnSettled<TData, TArgs, TError>,
  retryConfig?: RetryConfig<TData, TArgs, TError>,
  callbacks?: ProducerCallbacks<TData, TArgs, TError>
): PromiseLike<TData, TError> | undefined {
  let pendingPromise: PromiseLike<TData, TError>;
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

  if (isPromise(executionValue)) {
    pendingPromise = executionValue;
  } else {
    // final value
    onSuccess(executionValue);
    return;
  }

  pendingPromise = pendingPromise.then(onSuccess, onFail) as PromiseLike<
    TData,
    TError
  >;
  pendingPromise.status = "pending";
  return pendingPromise;

  function onSuccess(data: TData): TData {
    if (pendingPromise) {
      pendingPromise.status = "fulfilled";
      pendingPromise.value = data;
    }
    if (!indicators.aborted) {
      indicators.done = true;
      onSettled(data, success, cloneProducerProps(props), callbacks);
    }
    return data;
  }

  function onFail(error: TError) {
    if (pendingPromise) {
      pendingPromise.status = "rejected";
      pendingPromise.reason = error;
    }
    if (indicators.aborted) {
      return;
    }
    if (
      retryConfig?.enabled &&
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
