import React from "react";
import AsyncState from "async-state";
import useRawAsyncState from "./useRawAsyncState";
import { shallowClone } from "shared";

export function useStandaloneAsyncState(configuration, dependencies) {

  const asyncState = React.useMemo(function inferAsyncState() {
    const {key, promise, lazy, payload, initialValue} = configuration;
    const asyncStateInstance = new AsyncState(key, promise, {lazy, initialValue});
    asyncStateInstance.payload = shallowClone(payload);
    return asyncStateInstance;
  }, dependencies);

  return useRawAsyncState(asyncState, dependencies, configuration);
}
