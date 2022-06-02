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
import {standaloneRunExtraPropsCreator} from "../helpers/run-props-creator";


function runBySource<T>(src: AsyncStateSource<T>, lane?: string) {
  let asyncState = readAsyncStateFromSource(src).getLane(lane);
  return asyncState.run.bind(asyncState, standaloneRunExtraPropsCreator);
}

export function runSource<T>(src: AsyncStateSource<T>, ...args) {
  return runBySource(src)(...args);
}

export function runpSourceLane<T>(src: AsyncStateSource<T>, lane: string | undefined, ...args) {
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

    asyncState.run(standaloneRunExtraPropsCreator, ...args);
  });
}

export function runpSource<T>(src: AsyncStateSource<T>, ...args) {
  return runpSourceLane(src, undefined, ...args);
}

export function runSourceLane<T>(src: AsyncStateSource<T>, lane: string | undefined, ...args) {
  return runBySource(src, lane)(...args);
}

export function useRun<T>():
  ((keyOrSource: AsyncStateKeyOrSource<T>, ...args: any[]) => AbortFn) {
  const contextValue = React.useContext(AsyncStateContext);

  return React.useMemo(() => {
    return function run(
      keyOrSource: AsyncStateKeyOrSource<T>,
      ...args: any[]
    ): AbortFn {
      if (contextValue === null) {
        if (typeof keyOrSource === "string") {
          return undefined;
        } else {
          return runBySource(keyOrSource)(...args);
        }
      }
      return contextValue.runAsyncState(keyOrSource, undefined, ...args);
    }
  }, []);
}

export function useRunLane<T>():
  ((keyOrSource: AsyncStateKeyOrSource<T>, ...args: any[]) => AbortFn) {
  const contextValue = React.useContext(AsyncStateContext);

  return React.useMemo(() => {
    return function runLane(
      keyOrSource: AsyncStateKeyOrSource<T>,
      lane: string | undefined,
      ...args: any[]
    ): AbortFn {
      if (contextValue === null) {
        if (typeof keyOrSource === "string") {
          return undefined;
        } else {
          return runBySource(keyOrSource, lane)(...args);
        }
      }
      return contextValue.runAsyncState(keyOrSource, lane, ...args);
    }
  }, []);
}

export function useRunAsyncState<T>():
  ((keyOrSource: AsyncStateKeyOrSource<T>, ...args: any[]) => AbortFn) {
  console.error('[Deprecation warning] : useRunAsyncState is deprecated and ' +
    'will be removed before the v1. Please use useRun instead.' +
    'Like this: import { useRun } from "react-async-states"');
  return useRun();
}
