import React from "react";
import { AsyncStateContext } from "../context";
import { EMPTY_ARRAY, EMPTY_OBJECT, shallowClone } from "../../shared";
import { createInitialAsyncStatesReducer } from "./providerUtils";
import { AsyncStateManager } from "./AsyncStateManager";
import useProviderDevtools from "../../devtools/useProviderDevtools";

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
  useProviderDevtools(asyncStateEntries);

  const contextValue = React.useMemo(function getProviderValue() {
    let manager = managerRef.current;

    if (entriesRef.current !== asyncStateEntries || !manager) {
      manager = AsyncStateManager(asyncStateEntries, managerRef.current);
      managerRef.current = manager;
    }

    return {
      payload,
      manager,
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
    };
  }, [asyncStateEntries, payload]);

  entriesRef.current = asyncStateEntries;
  // synchronous effect to propagate payload
  React.useMemo(function propagatePayload() {
    if (!asyncStateEntries) {
      return;
    }

    const commonPayload = Object.assign(
      /*provider config*/{
        __provider__: {
          select: contextValue.select,
          run: contextValue.runAsyncState,
        }
      },
      payload,
    );

    Object.values(asyncStateEntries).forEach(function mergePayload(entry) {
      entry.value.payload = shallowClone(entry.value.payload, commonPayload);
    });
  }, [payload, contextValue]);

  React.useEffect(function disposeOldEntries() {
    if (!asyncStateEntries) {
      return undefined;
    }
    return function cleanup() {
      Object.values(asyncStateEntries).forEach(function disposeAsyncState(entry) {
        if (!asyncStateEntries[entry.value.key]) {
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
