import React from "react";
import { AsyncStateContext } from "./context";
import { EMPTY_ARRAY, EMPTY_OBJECT, invokeIfPresent } from "../utils";
import {
  createInitialAsyncStatesReducer,
  providerDispose,
  providerFork,
  providerGet,
  providerHoist,
  providerRun
} from "./utils/providerUtils";

function extractValue(entry) {
  return entry.value;
}

function nonLazyEntries(entry) {
  return !entry.value.config.lazy;
}


export function AsyncStateProvider({payload = EMPTY_OBJECT, children, initialAsyncStates = EMPTY_ARRAY}) {
  // mutable, and will be mutated!
  const asyncStateEntries = React.useMemo(function constructAsyncStates() {
    return initialAsyncStates.reduce(createInitialAsyncStatesReducer, {});
  }, [initialAsyncStates]);

  React.useEffect(function disposeOldEntries() {
    console.log('PROVIDER EFFECT')
    if (!asyncStateEntries || !asyncStateEntries.length) {
      return undefined;
    }

    const cleanups = asyncStateEntries
      .filter(nonLazyEntries) // get only non lazy!
      .map(contextValue.run) // this produces a side effect! it runs the async state entry, but collects the cleanup (which aborts and unsubscribes)

    return function cleanup() {
      if (asyncStateEntries) {
        Object.values(asyncStateEntries).map(extractValue).forEach(contextValue.dispose);
      }
      cleanups.forEach(function cleanupRun(cb) {
        invokeIfPresent(cb);
      })
    }
  }, [asyncStateEntries]);

  const contextValue = React.useMemo(() => ({
    payload,
    get: providerGet(asyncStateEntries),
    run: providerRun(asyncStateEntries),
    fork: providerFork(asyncStateEntries),
    hoist: providerHoist(asyncStateEntries),
    dispose: providerDispose(asyncStateEntries),
  }), [asyncStateEntries]);

  return (
    <AsyncStateContext.Provider value={contextValue}>
      {children}
    </AsyncStateContext.Provider>
  );
}

