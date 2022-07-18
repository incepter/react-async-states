import * as React from "react";
import {
  AbortFn,
  AsyncStateSource,
  AsyncStateStatus,
  State
} from "../async-state";
import {invokeIfPresent} from "../../../shared";
import {AsyncStateKeyOrSource} from "../types.internal";
import {AsyncStateContext} from "../context";
import {readAsyncStateFromSource} from "../async-state/read-source";
import {standaloneProducerEffectsCreator} from "../helpers/producer-effects";

export function runSource<T>(src: AsyncStateSource<T>, ...args): AbortFn {
  return runSourceLane(src, undefined, ...args);
}

export function runSourceLane<T>(src: AsyncStateSource<T>, lane: string | undefined, ...args): AbortFn {
  let asyncState = readAsyncStateFromSource(src).getLane(lane);
  return asyncState.run.call(asyncState, standaloneProducerEffectsCreator, ...args);
}

export function useRun<T>():
  ((keyOrSource: AsyncStateKeyOrSource<T>, ...args: any[]) => AbortFn) {
  const contextValue = React.useContext(AsyncStateContext);

  return React.useMemo(() => {
    if (contextValue === null) {
      return outsideContextRunFn;
    }
    return insideContextRunFn(contextValue);
  }, []);
}

export function useRunLane<T>():
  ((keyOrSource: AsyncStateKeyOrSource<T>, lane: string, ...args: any[]) => AbortFn) {
  const contextValue = React.useContext(AsyncStateContext);

  return React.useMemo(() => {
    if (contextValue === null) {
      return outsideContextRunLaneFn;
    }
    return insideContextRunLaneFn(contextValue);
  }, []);
}

export function runpSourceLane<T>(src: AsyncStateSource<T>, lane: string | undefined, ...args): Promise<State<T>> {
  let asyncState = readAsyncStateFromSource(src).getLane(lane);
  return new Promise(resolve => {
    let unsubscribe = asyncState.subscribe(subscription);

    function subscription(newState: State<T>) {
      if (newState.status === AsyncStateStatus.success
        || newState.status === AsyncStateStatus.error) {
        invokeIfPresent(unsubscribe);
        resolve(newState);
      }
    }

    asyncState.run(standaloneProducerEffectsCreator, ...args);
  });
}

export function runpSource<T>(src: AsyncStateSource<T>, ...args): Promise<State<T>> {
  return runpSourceLane(src, undefined, ...args);
}

export function invalidateCache<T>(src: AsyncStateSource<T>, cacheKey?: string): void {
  readAsyncStateFromSource(src).invalidateCache(cacheKey);
}

function outsideContextRunFn<T>(
  keyOrSource: AsyncStateKeyOrSource<T>,
  ...args: any[]
) {
  if (typeof keyOrSource === "string") {
    return undefined;
  } else {
    return runSource(keyOrSource, undefined, ...args);
  }
}

function outsideContextRunLaneFn<T>(
  keyOrSource: AsyncStateKeyOrSource<T>,
  lane: string,
  ...args: any[]
) {
  if (typeof keyOrSource === "string") {
    return undefined;
  } else {
    return runSource(keyOrSource, lane, ...args);
  }
}

function insideContextRunFn<T>(context) {
  return function runImpl(
    keyOrSource: AsyncStateKeyOrSource<T>,
    ...args: any[]
  ): AbortFn {
    return context.runAsyncState(keyOrSource, undefined, ...args);
  }
}

function insideContextRunLaneFn<T>(context) {
  return function runImpl(
    keyOrSource: AsyncStateKeyOrSource<T>,
    lane: string,
    ...args: any[]
  ): AbortFn {
    return context.runAsyncState(keyOrSource, lane, ...args);
  }
}
