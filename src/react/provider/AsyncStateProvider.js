import React from "react";
import { AsyncStateContext } from "../context";
import { EMPTY_ARRAY, EMPTY_OBJECT, shallowClone } from "../../shared";
import { createInitialAsyncStatesReducer } from "./providerUtils";
import { AsyncStateManager } from "../orchestration/AsyncStateManager";

export function AsyncStateProvider({payload = EMPTY_OBJECT, children, initialAsyncStates = EMPTY_ARRAY}) {
  // mutable, and will be mutated!
  // this asyncStateEntries may receive other entries at runtime if you hoist
  const asyncStateEntries = React.useMemo(function constructAsyncStates() {
    return Object.valyes(initialAsyncStates).reduce(createInitialAsyncStatesReducer, {});
  }, [initialAsyncStates]);

  React.useLayoutEffect(function onPayloadChange() {
    if (!asyncStateEntries) {
      return;
    }
    Object.values(asyncStateEntries).forEach(function mergePayload(entry) {
      entry.value.payload = shallowClone(entry.value.payload, payload);
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
