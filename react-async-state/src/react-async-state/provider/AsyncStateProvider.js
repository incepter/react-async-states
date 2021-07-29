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
    if (!asyncStateEntries) {
      return undefined;
    }

    const aborts = Object.values(asyncStateEntries)
      .map(function runEntry(entry) {
        return entry.value.config.lazy ? undefined : contextValue.run(entry.value)
      }) // this produces a side effect! it runs the async state entry, but collects the cleanup (which aborts and unsubscribes)

    return function cleanup() {
      aborts.forEach(function cleanupRun(cb) {
        invokeIfPresent(cb);
      });
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

  return (
    <AsyncStateContext.Provider value={contextValue}>
      {children}
    </AsyncStateContext.Provider>
  );
}
