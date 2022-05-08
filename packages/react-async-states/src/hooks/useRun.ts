import * as React from "react";
import {AbortFn, AsyncStateSource} from "../async-state";
import {AsyncStateKeyOrSource} from "../types.internal";
import {AsyncStateContext} from "../context";
import {readAsyncStateFromSource} from "../async-state/read-source";
import {standaloneRunExtraPropsCreator} from "../helpers/run-props-creator";


function runBySource<T>(src: AsyncStateSource<T>) {
  const asyncState = readAsyncStateFromSource(src);
  return asyncState.run.bind(asyncState, standaloneRunExtraPropsCreator);
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
      return contextValue.runAsyncState(keyOrSource, ...args);
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
