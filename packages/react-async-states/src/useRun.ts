import * as React from "react";
import {StateContext} from "./context";
import {isSource, AbortFn, AsyncStateKeyOrSource, Source} from "async-states";
import {StateContextValue} from "./types.internal";

type RunFunction<T, E, R> = ((
  keyOrSource: AsyncStateKeyOrSource<T, E, R>, ...args: any[]) => AbortFn);
type RunLaneFunction<T, E, R> = ((
  keyOrSource: AsyncStateKeyOrSource<T, E, R>, lane: string | undefined,
  ...args: any[]
) => AbortFn);

export function useRun<T, E, R>(): RunFunction<T, E, R> {
  const contextValue = React.useContext(StateContext);
  return contextValue !== null ? runInside.bind(null, contextValue) : runOutside;
}

export function useRunLane<T, E, R>(): RunLaneFunction<T, E, R> {
  const contextValue = React.useContext(StateContext);
  return contextValue !== null ? runLaneInside.bind(null, contextValue) : runLaneOutside;
}

function runLaneOutside<T, E, R>(
  keyOrSource: AsyncStateKeyOrSource<T, E, R>,
  lane: string | undefined,
  ...args: any[]
) {
  if (isSource(keyOrSource)) {
    return (keyOrSource as Source<T, E, R>).getLaneSource(lane).run(...args);
  }
  return undefined;
}
function runOutside<T, E, R>(
  keyOrSource: AsyncStateKeyOrSource<T, E, R>,
  ...args: any[]
) {
  return runLaneOutside(keyOrSource, undefined, ...args);
}

function runLaneInside<T, E, R>(
  contextValue: StateContextValue,
  keyOrSource: AsyncStateKeyOrSource<T, E, R>,
  lane: string | undefined,
  ...args: any[]
) {
  if (isSource(keyOrSource)) {
    return (keyOrSource as Source<T, E, R>).getLaneSource(lane).run(...args);
  }
  if (typeof keyOrSource === "string") {
    let instance = contextValue.get<T, E, R>(keyOrSource);
    if (instance) {
      return instance.run
        .bind(instance, contextValue.createEffects)
        .apply(null, args);
    }
  }
  return undefined;
}

function runInside<T, E, R>(
  contextValue: StateContextValue,
  keyOrSource: AsyncStateKeyOrSource<T, E, R>,
  ...args: any[]
) {
  return runLaneInside(contextValue, keyOrSource, undefined, ...args);
}
