import React from "react";
import { AsyncStateContext } from "../context";
import { EMPTY_ARRAY, EMPTY_OBJECT, mergeObjects } from "../../shared";
import { createInitialAsyncStatesReducer } from "./providerUtils";
import { AsyncStateManager } from "../../orchestration/AsyncStateManager";

export function AsyncStateProvider({payload = EMPTY_OBJECT, children, initialAsyncStates = EMPTY_ARRAY}) {
  // mutable, and will be mutated!
  // this asyncStateEntries may receive other entries at runtime if you hoist
  const asyncStateEntries = React.useMemo(function constructAsyncStates() {
    return initialAsyncStates.reduce(createInitialAsyncStatesReducer, {});
  }, [initialAsyncStates]);

  React.useLayoutEffect(function onPayloadChange() {
    if (!asyncStateEntries) {
      return;
    }
    Object.values(asyncStateEntries).forEach(function mergePayload(entry) {
      entry.value.payload = mergeObjects(entry.value.payload, payload);
    });
  }, [payload]);

  React.useEffect(function disposeOldEntries() {
    if (!asyncStateEntries) {
      return;
    }
    return function cleanup() {
      Object.values(asyncStateEntries).forEach(function disposeAsyncState(entry) {
        contextValue.dispose(entry.value);
      });
    }
  }, [asyncStateEntries]);

  const contextValue = React.useMemo(function getProviderValue() {
    return mergeObjects({payload}, AsyncStateManager(asyncStateEntries));
  }, [asyncStateEntries, payload]);

  // React.useEffect(() => {
  //   const id = setInterval(() => console.log(asyncStateEntries), 2000);
  //   return () => clearInterval(id);
  // }, []);

  return (
    <AsyncStateContext.Provider value={contextValue}>
      {children}
    </AsyncStateContext.Provider>
  );
}
