import * as React from "react";
import {AsyncStateContext} from "../context";
import {shallowClone} from "shared";
import {AsyncStateManager} from "./AsyncStateManager";
import {
  AsyncStateContextValue,
  AsyncStateEntry,
  AsyncStateManagerInterface,
  StateProviderProps,
  UseAsyncStateContextType
} from "../types.internal";
import useProviderDevtools from "devtools/useProviderDevtools";

export function AsyncStateProvider(
  {
    children,
    payload,
    initialStates
  }: StateProviderProps) {

  // manager per provider
  // this manager lives with the provider and will never change
  // the initialize function creates a mutable manager instance
  const manager = React.useMemo<AsyncStateManagerInterface>(initialize, []);

  useProviderDevtools(manager.entries);

  // this function should only tell the manager to execute a diffing
  // of items he has and the new ones
  // we need to figure out a way to un-reference these dirty states
  const dirtyStates = React
    .useMemo<{ data: AsyncStateEntry<any>[] }>(onInitialStatesChange, [initialStates]);

  // this will serve to dispose old async states that were hoisted
  // since initialStates changed
  React.useEffect(onDirtyStatesChange, [dirtyStates]);

  // this should synchronously change the payload held by hoisted items
  // why not until effect? because all children may benefit from this in their
  // effects
  React.useMemo<void>(onPayloadChange, [payload]);

  const contextValue = React.useMemo<UseAsyncStateContextType>(
    makeContextValue,
    [manager, payload]
  );

  // React.useEffect(() => {
  //   let id = setInterval(() => console.log('manager', manager.entries), 5000);
  //   return () => clearInterval(id);
  // }, []);

  return (
    <AsyncStateContext.Provider value={contextValue}>
      {children}
    </AsyncStateContext.Provider>
  );
  function initialize() {
    return AsyncStateManager(initialStates);
  }

  function onInitialStatesChange(): { data: AsyncStateEntry<any>[] } {
    const output = Object.create(null);
    output.data = manager.setInitialStates(initialStates);
    return output;
  }

  function onDirtyStatesChange() {
    for (const entry of dirtyStates.data) {
      manager.dispose(entry.value);
    }
    // mutating this object here means un-referencing these entries
    // which should throw them to gc.
    dirtyStates.data = [];
  }

  function onPayloadChange() {
    // propagate the new payload
    for (const entry of Object.values(manager.entries)) {
      entry.value.payload = shallowClone(entry.value.payload, payload);
    }
  }

  function makeContextValue(): AsyncStateContextValue {
    return {
      manager,
      payload: shallowClone(payload),

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
      runExtraPropsCreator: manager.runExtraPropsCreator,
    };
  }


}
