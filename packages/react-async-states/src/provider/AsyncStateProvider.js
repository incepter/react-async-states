import React from "react";
import { AsyncStateContext } from "../context";
import { __DEV__, EMPTY_ARRAY, EMPTY_OBJECT, shallowClone } from "shared";
import { createInitialAsyncStatesReducer } from "./utils/providerUtils";
import { AsyncStateManager } from "./utils/AsyncStateManager";
import useProviderDevtools from "devtools/useProviderDevtools";

export function AsyncStateProvider({payload = EMPTY_OBJECT, children, initialAsyncStates = EMPTY_ARRAY}) {
  const managerRef = React.useRef();
  const entriesRef = React.useRef();
  // mutable, and will be mutated!
  // this asyncStateEntries may receive other entries at runtime if you hoist
  const asyncStateEntries = React.useMemo(function constructAsyncStates() {
    // this re-uses the old managed async states, and bind to them the new ones
    const initialValue = shallowClone(entriesRef.current);
    return Object.values(initialAsyncStates).reduce(createInitialAsyncStatesReducer, initialValue);
  }, [initialAsyncStates]);
  if (__DEV__) useProviderDevtools(asyncStateEntries);

  const contextValue = React.useMemo(function getProviderValue() {
    let manager = managerRef.current;

    if (entriesRef.current !== asyncStateEntries || !manager) {
      manager = AsyncStateManager(asyncStateEntries, managerRef.current);
      managerRef.current = manager;
    }

    return {
      manager,
      payload: constructContextPayload(manager, payload),

      get: manager.get,
      run: manager.run,
      fork: manager.fork,
      hoist: manager.hoist,
      watch: manager.watch,
      select: manager.select,
      dispose: manager.dispose,
      watchAll: manager.watchAll,
      getAllKeys: manager.getAllKeys,
      runAsyncState: manager.runAsyncState,
      notifyWatchers: manager.notifyWatchers,
    };
  }, [asyncStateEntries, payload]);

  entriesRef.current = asyncStateEntries;

  React.useEffect(function disposeOldEntries() {
    if (!asyncStateEntries) {
      return undefined;
    }
    return function cleanup() {
      // here asyncStateEntries points to old manager
      Object.values(asyncStateEntries).forEach(function disposeAsyncState(entry) {
        // entriesRef.current is the new manager
        // this conditions means this async state was dismissed and no longer used, should be disposed then removed
        if (!entriesRef.current[entry.value.key]) {
          contextValue.dispose(entry.value);
        }
      });
    }
  }, [asyncStateEntries]);

  // React.useEffect(() => {
  //   const id = setInterval(() => console.log(asyncStateEntries), 5000);
  //   return () => clearInterval(id);
  // }, []);

  return (
    <AsyncStateContext.Provider value={contextValue}>
      {children}
    </AsyncStateContext.Provider>
  );
}

function constructContextPayload(manager, otherPayload) {
  if (manager == null) {
    return undefined;
  }
  return Object.assign(
    {
      __provider__: {
        select: manager.select,
        run: manager.runAsyncState,
      }
    },
    otherPayload,
  );
}
