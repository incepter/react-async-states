import React from "react";
import { AsyncStateContext } from "../context";
import { EMPTY_ARRAY, EMPTY_OBJECT, mergeObjects } from "../../utils";
import { createInitialAsyncStatesReducer } from "./providerUtils";
import { AsyncStateManager } from "./AsyncStateManager";

export function AsyncStateProvider({payload = EMPTY_OBJECT, children, initialAsyncStates = EMPTY_ARRAY}) {
  // mutable, and will be mutated!
  // this asyncStateEntries may receive other entries at runtime if you hoist
  const asyncStateEntries = React.useMemo(function constructAsyncStates() {
    return initialAsyncStates.reduce(createInitialAsyncStatesReducer, {});
  }, [initialAsyncStates]);

  React.useLayoutEffect(function onPayloadChange() {
    Object.values(asyncStateEntries).forEach(function onPayload(entry) {
      entry.value.payload = mergeObjects(entry.value.payload, payload);
    })
  }, [payload]);

  React.useEffect(function disposeOldEntries() {
    if (!asyncStateEntries) {
      return undefined;
    }
    return function cleanup() {
      if (asyncStateEntries) {
        Object.values(asyncStateEntries).forEach(function disposeAsyncState(entry) {
          contextValue.dispose(entry);
        });
      }
    }
  }, [asyncStateEntries]);

  const contextValue = React.useMemo(function getProviderValue() {
    const manager = AsyncStateManager(asyncStateEntries);

    return {
      payload,
      get: manager.get,
      run: manager.run,
      fork: manager.fork,
      hoist: manager.hoist,
      waitFor: manager.waitFor,
      dispose: manager.dispose,
      runAsyncState: manager.runAsyncState,
    };
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
