import React from "react";
import { AsyncStateContext } from "../context";
import { EMPTY_ARRAY, EMPTY_OBJECT, invokeIfPresent } from "../../utils";
import { createInitialAsyncStatesReducer } from "./providerUtils";
import { AsyncStateManager } from "./AsyncStateManager";

export function AsyncStateProvider({payload = EMPTY_OBJECT, children, initialAsyncStates = EMPTY_ARRAY}) {
  // mutable, and will be mutated!
  // this asyncStateEntries may receive other entries at runtime if you hoist
  const asyncStateEntries = React.useMemo(function constructAsyncStates() {
    return initialAsyncStates.reduce(createInitialAsyncStatesReducer, {});
  }, [initialAsyncStates]);

  React.useEffect(function disposeOldEntriesAndRunNonLazy() {
    if (!asyncStateEntries || !asyncStateEntries.length) {
      return undefined;
    }

    const aborts = asyncStateEntries
      .filter(nonLazyEntry) // get only non lazy!
      .map(contextValue.run) // this produces a side effect! it runs the async state entry, but collects the cleanup (which aborts and unsubscribes)

    return function cleanup() {
      aborts.forEach(function cleanupRun(cb) {
        invokeIfPresent(cb);
      });
      if (asyncStateEntries) {
        Object.values(asyncStateEntries).map(extractValue).forEach(contextValue.dispose);
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
      dispose: manager.dispose,
    };
  }, [asyncStateEntries, payload]);

  return (
    <AsyncStateContext.Provider value={contextValue}>
      {children}
    </AsyncStateContext.Provider>
  );
}

function extractValue(entry) {
  return entry.value;
}

function nonLazyEntry(entry) {
  return !entry.value.config.lazy;
}
