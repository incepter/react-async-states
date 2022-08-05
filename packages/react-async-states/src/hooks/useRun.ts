import * as React from "react";
import {AbortFn} from "../async-state";
import {AsyncStateKeyOrSource} from "../types.internal";
import {AsyncStateContext} from "../context";
import {
  insideContextRunFn,
  insideContextRunLaneFn,
  outsideContextRunFn,
  outsideContextRunLaneFn
} from "../helpers/source-utils";

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
