import React from "react";
import AsyncState from "../../async-state/AsyncState";
import useRawAsyncState from "./useRawAsyncState";

export function useStandaloneAsyncState(configuration, dependencies) {

  const asyncState = React.useMemo(function inferAsyncState() {
    const {key, promiseConfig} = configuration;
    return new AsyncState({key, ...promiseConfig});
  }, dependencies);

  return useRawAsyncState(asyncState, dependencies, configuration);
}