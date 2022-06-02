import * as React from "react";
import {AbortFn, AsyncStateSource} from "../async-state";
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
