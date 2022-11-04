import * as React from "react";
import {AbortFn, AsyncStateKeyOrSource} from "../async-state";
import {AsyncStateContext} from "./context";
import {
  insideContextRunFn,
  insideContextRunLaneFn,
  outsideContextRunFn,
  outsideContextRunLaneFn
} from "../async-state/source-utils";

export function useRun<T>():
  ((keyOrSource: AsyncStateKeyOrSource<T>, ...args: any[]) => AbortFn) {
  const contextValue = React.useContext(AsyncStateContext);

  return React.useMemo(() => {
    if (contextValue === null) {
      return outsideContextRunFn;
    }
    return insideContextRunFn(contextValue);
  }, [contextValue]);
}

export function useRunLane<T>():
  ((keyOrSource: AsyncStateKeyOrSource<T>, lane: string | undefined, ...args: any[]) => AbortFn) {
  const contextValue = React.useContext(AsyncStateContext);

  return React.useMemo(() => {
    if (contextValue === null) {
      return outsideContextRunLaneFn;
    }
    return insideContextRunLaneFn(contextValue);
  }, [contextValue]);
}
