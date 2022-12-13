import * as React from "react";
import {AsyncStateContext} from "./context";
import {
  AsyncStateEntry,
  AsyncStateManager,
  ManagerInterface,
  StateProviderProps
} from "../async-state";
import {StateContextValue, UseAsyncStateContextType} from "../types.internal";
import {AsyncStateEntries} from "../async-state/AsyncStateManager";

// let didWarnAboutProviderDeprecated = false;
/**
 * The provider will be removed in the next stable release
 * don't rely on it as it only causes errors and this part will
 * be delegated completely outside React
 */
export function AsyncStateProvider(
  {
    payload,
    children,
    initialStates,
    manager: providedManager,
  }: StateProviderProps) {
  // if (__DEV__) {
  //   if (!didWarnAboutProviderDeprecated) {
  //     warning(`[Deprecation Warning] The provider will be deprecated in v2.
  //     Please limit your usage with the provider.\n
  //     There will be no provider and useAsyncState({key: "some-key"}) will just work.
  //     \nThe recommendation for now is to keep the keys unique and don't make
  //     any abstraction assuming there are multiple providers and keys are unique
  //     per provider. For the payload, there will be a global way to set it and it
  //     so all features would remain working.`);
  //     didWarnAboutProviderDeprecated = true;
  //   }
  // }

  const manager = React
    .useMemo<ManagerInterface>(initialize, [providedManager]);

  // this function should only tell the manager to execute a diffing
  // of items he has and the new ones
  // we need to figure out a way to un-reference these dirty states
  const dirtyStates = React
    .useMemo<{ data: AsyncStateEntry<any>[] }>
    (onInitialStatesChange, [manager, initialStates]);

  // this will serve to dispose old async states that were hoisted
  // since initialStates changed
  React.useEffect(onDirtyStatesChange, [dirtyStates]);

  // this should synchronously change the payload held by hoisted items
  // why not until effect? because all children may benefit from this in their
  // effects
  React.useMemo<void>(onPayloadChange, [manager, payload]);

  const contextValue = React.useMemo<UseAsyncStateContextType>(
    makeContextValue,
    [manager]
  );

  React.useEffect(disposeManager, [manager]);

  return (
    <AsyncStateContext.Provider value={contextValue}>
      {children}
    </AsyncStateContext.Provider>
  );

  function initialize() {
    if (providedManager) {
      return providedManager;
    }
    return AsyncStateManager(initialStates);
  }

  function disposeManager() {
    return function cleanup() {
      Promise.resolve().then(() => {
        Object.values(manager.entries)
          .forEach(entry => manager.dispose(entry.instance))
      });
    }
  }

  function onInitialStatesChange(): { data: AsyncStateEntry<any>[] } {
    const output = Object.create(null);
    output.data = manager.setStates(initialStates);
    return output;
  }

  function onDirtyStatesChange() {
    for (const entry of dirtyStates.data) {
      manager.dispose(entry.instance);
    }
    // mutating this object here means un-referencing these entries
    // which should throw them to gc.
    dirtyStates.data = [];
  }

  function onPayloadChange() {
    // propagate the new payload
    manager.mergePayload(payload);
  }

  function makeContextValue(): StateContextValue {
    return manager;
  }
}

