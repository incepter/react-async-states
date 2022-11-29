import * as React from "react";
import {AbortFn, AsyncStateKeyOrSource, Source} from "../async-state";
import {AsyncStateContext} from "./context";
import {isSource} from "../async-state/utils";
import {StateContextValue} from "../types.internal";

type RunFunction<T> = ((
  keyOrSource: AsyncStateKeyOrSource<T>, ...args: any[]) => AbortFn);
type RunLaneFunction<T> = ((
  keyOrSource: AsyncStateKeyOrSource<T>, lane: string | undefined,
  ...args: any[]
) => AbortFn);

export function useRun<T>(): RunFunction<T> {
  const contextValue = React.useContext(AsyncStateContext);
  return contextValue !== null ? runInside.bind(null, contextValue) : runOutside;
}

export function useRunLane<T>(): RunLaneFunction<T> {
  const contextValue = React.useContext(AsyncStateContext);
  return contextValue !== null ? runLaneInside.bind(null, contextValue) : runLaneOutside;
}
function runLaneOutside<T>(
  keyOrSource: AsyncStateKeyOrSource<T>,
  lane: string | undefined,
  ...args: any[]
) {
  if (isSource(keyOrSource)) {
    return (keyOrSource as Source<T>).getLaneSource(lane).run(...args);
  }
  return undefined;
}
function runOutside<T>(
  keyOrSource: AsyncStateKeyOrSource<T>,
  ...args: any[]
) {
  return runLaneOutside(keyOrSource, undefined, ...args);
}

function runLaneInside<T>(
  contextValue: StateContextValue,
  keyOrSource: AsyncStateKeyOrSource<T>,
  lane: string | undefined,
  ...args: any[]
) {
  if (isSource(keyOrSource)) {
    return (keyOrSource as Source<T>).getLaneSource(lane).run(...args);
  }
  if (typeof keyOrSource === "string") {
    let instance = contextValue.get<T>(keyOrSource);
    if (instance) {
      return instance.run
        .bind(instance, contextValue.createEffects)
        .apply(null, args);
    }
  }
  return undefined;
}

function runInside<T>(
  contextValue: StateContextValue,
  keyOrSource: AsyncStateKeyOrSource<T>,
  ...args: any[]
) {
  return runLaneInside(contextValue, keyOrSource, undefined, ...args);
}
