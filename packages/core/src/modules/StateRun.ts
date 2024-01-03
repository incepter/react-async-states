import {
  AbortFn,
  CachedState,
  ErrorState,
  PendingState,
  ProducerCallbacks,
  ProducerSavedProps,
  RUNCProps,
  StateInterface,
  SuccessState,
} from "../types";
import { pending, RunEffect, Status } from "../enums";
import { __DEV__, cloneProducerProps, emptyArray, isFunction } from "../utils";
import { freeze, noop, now } from "../helpers/core";
import {
  computeRunHash,
  didCachedStateExpire,
  getCachedState,
  hasCacheEnabled,
  removeCachedStateAndSpreadOnLanes,
} from "./StateCache";
import { createProps } from "./StateProps";
import { run } from "../wrapper";
import devtools from "../devtools/Devtools";
import {
  replaceInstanceState,
  startAlteringState,
  stopAlteringState,
} from "./StateUpdate";

export function runcInstance<TData, TArgs extends unknown[], TError>(
  instance: StateInterface<TData, TArgs, TError>,
  props?: RUNCProps<TData, TArgs, TError>
) {
  let config = instance.config;

  let effectDurationMs = Number(config.runEffectDurationMs) || 0;
  let shouldRunImmediately = !config.runEffect || effectDurationMs === 0;

  if (shouldRunImmediately) {
    let clonedPayload = Object.assign({}, instance.payload);
    return runInstanceImmediately(instance, clonedPayload, props);
  }

  return runInstanceWithEffects(
    instance,
    config.runEffect!,
    effectDurationMs,
    props
  );
}

function scheduleDelayedRun<TData, TArgs extends unknown[], TError>(
  instance: StateInterface<TData, TArgs, TError>,
  durationMs: number,
  props?: RUNCProps<TData, TArgs, TError>
): AbortFn {
  let abortCallback: AbortFn | null = null;

  let timeoutId = setTimeout(function theDelayedRunExecution() {
    instance.pendingTimeout = null;

    let clonedPayload = Object.assign({}, instance.payload);
    abortCallback = runInstanceImmediately(instance, clonedPayload, props);
  }, durationMs);

  instance.pendingTimeout = { at: Date.now(), id: timeoutId };

  return function abortCleanup(reason?: any) {
    clearTimeout(timeoutId);
    instance.pendingTimeout = null;

    if (isFunction(abortCallback)) {
      abortCallback(reason);
    }
  };
}

function runInstanceWithEffects<TData, TArgs extends unknown[], TError>(
  instance: StateInterface<TData, TArgs, TError>,
  effect: RunEffect,
  durationMs: number,
  props?: RUNCProps<TData, TArgs, TError>
): AbortFn {
  switch (effect) {
    case "delay":
    case "debounce": {
      if (instance.pendingTimeout) {
        let now = Date.now();
        let deadline = instance.pendingTimeout.at + durationMs;
        if (now < deadline) {
          clearTimeout(instance.pendingTimeout.id);
        }
      }
      return scheduleDelayedRun(instance, durationMs, props);
    }
    case "throttle": {
      if (instance.pendingTimeout) {
        let now = Date.now();
        let deadline = instance.pendingTimeout.at + durationMs;
        if (now <= deadline) {
          return function noop() {
            // do nothing when throttled
          };
        }
        break;
      } else {
        return scheduleDelayedRun(instance, durationMs, props);
      }
    }
  }

  let clonedPayload = Object.assign({}, instance.payload);
  return runInstanceImmediately(instance, clonedPayload, props);
}

function cleanInstancePendingStateBeforeImmediateRun(
  instance: StateInterface<any, any, any>
) {
  if (instance.pendingUpdate) {
    clearTimeout(instance.pendingUpdate.id);
    instance.pendingUpdate = null;
  }

  instance.actions.abort();
  instance.currentAbort = undefined;
}

function replaceStateBecauseNoProducerProvided<
  TData,
  TArgs extends unknown[],
  TError,
>(
  instance: StateInterface<TData, TArgs, TError>,
  props?: RUNCProps<TData, TArgs, TError>
) {
  let args = (props?.args ?? emptyArray) as TArgs;

  // keep these for readability
  let newStateData = args[0] as TData;
  let newStateStatus = args[1] as Status;

  instance.actions.setState(newStateData, newStateStatus, props);

  return noop;
}

function replaceStateAndBailoutRunFromCachedState<
  TData,
  TArgs extends unknown[],
  TError,
>(
  instance: StateInterface<TData, TArgs, TError>,
  cachedState: CachedState<TData, TArgs, TError>
) {
  let actualState = instance.state;
  let nextState = cachedState.state;

  // this means that the current state reference isn't the same
  if (actualState !== nextState) {
    // this sets the new state and notifies subscriptions
    // true for notifying
    // todo: update latest run
    replaceInstanceState(instance, nextState, true);
  }
}

export function runInstanceImmediately<TData, TArgs extends unknown[], TError>(
  instance: StateInterface<TData, TArgs, TError>,
  payload: unknown,
  props?: RUNCProps<TData, TArgs, TError>
): AbortFn {
  // when there is no producer attached to the instance, skip everything
  // and replace state immediately. This will skip cache too.
  instance.promise = null;
  if (!instance.fn) {
    return replaceStateBecauseNoProducerProvided(instance, props);
  }

  let wasAltering = startAlteringState();

  // the pendingUpdate has always a pending status, it is delayed because
  // of the config.skipPendingDelayMs configuration option.
  let hasPendingUpdate = instance.pendingUpdate !== null;
  let isCurrentlyPending = instance.state.status === pending;

  if (isCurrentlyPending || hasPendingUpdate) {
    cleanInstancePendingStateBeforeImmediateRun(instance);
  }
  // this should not be into the previous if, because we need all the time
  // to invoke the currentAbort so that cleanups of the previous run are invoked
  if (isFunction(instance.currentAbort)) {
    instance.currentAbort();
  }

  if (hasCacheEnabled(instance)) {
    let cacheConfig = instance.config.cacheConfig;
    let runHash = computeRunHash(payload, props, cacheConfig?.hash);

    let cachedState = getCachedState(instance, runHash);

    // only use a cached entry if not expired
    if (cachedState && !didCachedStateExpire(cachedState)) {
      replaceStateAndBailoutRunFromCachedState(instance, cachedState);
      if (__DEV__) devtools.emitRun(instance, true);
      return;
    }
    // this means that the cache entry was expired, we need to removed it
    // from the cache
    if (cachedState) {
      removeCachedStateAndSpreadOnLanes(instance, runHash);
    }
  }

  let indicators = { index: 1, done: false, cleared: false, aborted: false };
  let producerProps = createProps(instance, indicators, payload, props);

  instance.latestRun = {
    args: producerProps.args,
    payload: producerProps.payload,
  };
  instance.currentAbort = producerProps.abort;

  let runResult = run(
    instance.fn,
    producerProps,
    indicators,
    onSettled,
    instance.config.retryConfig,
    props // callbacks
  );

  if (runResult) {
    // Promise<TData>
    if (__DEV__) devtools.emitRun(instance, false);

    instance.promise = runResult;
    let currentState = instance.state;
    if (currentState.status === pending) {
      currentState = currentState.prev;
    }
    let savedProps = cloneProducerProps(producerProps);
    let pendingState: PendingState<TData, TArgs, TError> = {
      data: null,
      timestamp: now(),
      props: savedProps,
      prev: currentState,
      status: pending,
    };

    replaceInstanceState(instance, pendingState, true, props);
    stopAlteringState(wasAltering);
    return producerProps.abort;
  }

  if (__DEV__) devtools.emitRun(instance, false);

  stopAlteringState(wasAltering);
  return producerProps.abort;

  function onSettled(
    data: TData | TError,
    status: "success" | "error",
    savedProps: ProducerSavedProps<TData, TArgs>,
    callbacks?: ProducerCallbacks<TData, TArgs, TError>
  ) {
    let state = freeze({
      status,
      data,
      props: savedProps,
      timestamp: now(),
    } as SuccessState<TData, TArgs> | ErrorState<TData, TArgs, TError>);
    replaceInstanceState(instance, state, true, callbacks);
  }
}
