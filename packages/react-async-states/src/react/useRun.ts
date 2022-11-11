import * as React from "react";
import {AbortFn, AsyncStateKeyOrSource, Source} from "../async-state";
import {AsyncStateContext} from "./context";
import {isAsyncStateSource} from "../async-state/utils";
import {StateContextValue} from "../types.internal";

type RunFunction<T> = ((keyOrSource: AsyncStateKeyOrSource<T>, ...args: any[]) => AbortFn);
type RunLaneFunction<T> = ((keyOrSource: AsyncStateKeyOrSource<T>, lane: string | undefined, ...args: any[]) => AbortFn);

function runLaneFn<T>(
  contextValue: StateContextValue | null,
  keyOrSource: AsyncStateKeyOrSource<T>,
  lane: string | undefined,
  ...args: any[]
) {
  if (isAsyncStateSource(keyOrSource)) {
    return (keyOrSource as Source<T>).getLaneSource(lane).run(...args);
  }
  if (contextValue !== null) {
    if (typeof keyOrSource === "string") {
      let instance = contextValue.get<T>(keyOrSource);
      if (instance) {
        return contextValue.run(instance.getLane(lane), ...args);
      }
    }
  }
  return undefined;
}

function runFn<T>(
  contextValue: StateContextValue | null,
  keyOrSource: AsyncStateKeyOrSource<T>,
  ...args: any[]
) {
  return runLaneFn(contextValue, keyOrSource, undefined, ...args);
}

export function useRun<T>(): RunFunction<T> {
  const contextValue = React.useContext(AsyncStateContext);
  return React.useCallback(runFn.bind(null, contextValue), [contextValue]);
}

export function useRunLane<T>() : RunLaneFunction<T> {
  const contextValue = React.useContext(AsyncStateContext);
  return React.useCallback(runLaneFn.bind(null, contextValue), [contextValue]);
}
