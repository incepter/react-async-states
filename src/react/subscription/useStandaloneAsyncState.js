import React from "react";
import AsyncState from "../../async-state/AsyncState";
import useRawAsyncState from "./useRawAsyncState";

export function useStandaloneAsyncState(configuration, dependencies) {

  const asyncState = React.useMemo(function inferAsyncState() {
    const {key, promise, lazy, initialValue} = configuration;
    return new AsyncState(key, promise, {lazy, initialValue});
  }, dependencies);

  return useRawAsyncState(asyncState, dependencies, configuration);
}
