import * as React from "react";
import {AsyncStateContext} from "../context";
import {shallowClone} from "shared";
import {AsyncStateManager} from "./utils/AsyncStateManager";
import {
  AsyncStateContextValue,
  AsyncStateEntry,
  AsyncStateManagerInterface,
  StateProviderProps,
  UseAsyncStateContextType
} from "../types";
import useProviderDevtools from "devtools/useProviderDevtools";

/**
 * Provider v2
 *
 * accepts:
 * - initialStates
 * - payload
 * - children (the actual tree)
 *
 * hooks:
 * 1 x useMemo : the manager
 * 1 x useMemo [initialStates] : mutate the manager and gets dirty states
 * 1 x useEffect [stateEntries] : dispose states that are no longer used
 *
 */

export function AsyncStateProvider(
  {
    children,
    payload,
    initialStates,
    initialAsyncStates
  }: StateProviderProps) {

  if (initialAsyncStates) {
    console.log(
      "initialAsyncStates is no longer supported in AsyncStateProvider." +
      "Please use initialState instead."
    );
  }

  // manager per provider
  // this manager lives with the provider
  // the initialize function should create a mutable manager instance
  const manager = React.useMemo<AsyncStateManagerInterface>(initialize, []);


  useProviderDevtools(manager.entries);

  // this function should only tell the manager to execute a diffing
  // of items he has and the new ones
  // we need to figure out a way to un-reference these dirty states
  const dirtyStates = React
    .useMemo<AsyncStateEntry<any>[]>(onInitialStatesChange, [initialStates]);

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

  // there is no point of having an onUnmount effect that disposes all entries
  // because if this unmounts, all the tree inside will be thrown to gc
  // and thus, the whole manager is unreferenced and its memory will be cleared

  function initialize() {
    return AsyncStateManager(initialStates);
  }

  function onInitialStatesChange() {
    return manager.setInitialStates(initialStates);
  }

  function onDirtyStatesChange() {
    for (const entry of dirtyStates) {
      manager.dispose(entry.value);
    }
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
    };
  }

  return (
    <AsyncStateContext.Provider value={contextValue}>
      {children}
    </AsyncStateContext.Provider>
  );

}
