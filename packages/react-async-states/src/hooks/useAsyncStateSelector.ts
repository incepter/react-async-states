import * as React from "react";
import {EMPTY_ARRAY, identity, invokeIfPresent, shallowEqual} from "shared";
import {
  AsyncStateSelector,
  AsyncStateSelectorKeys,
  EqualityFn,
  SelectorKeysArg,
  SelectorManager,
  SelectorSubscription
} from "../types.internal";
import {AsyncStateInterface, AsyncStateKey} from "../../../async-state";
import useAsyncStateContext from "./useAsyncStateContext";

export function useAsyncStateSelector<T>(
  keys: SelectorKeysArg,
  selector: AsyncStateSelector<T> = identity,
  areEqual: EqualityFn<T> = shallowEqual,
  initialValue?: T
): T {

  const contextValue = useAsyncStateContext();

  // read actual keys as a memo, will be used as dependencies
  const watchedKeys: string[] = React.useMemo<string[]>(readKeys, [keys]);

  if (watchedKeys.length === 0) {
    throw new Error("A selector cannot have 0 watched keys.");
  }

  const manager = React.useMemo<SelectorManager>(newSelectorManager, EMPTY_ARRAY);

  React.useEffect(watchUnmount, EMPTY_ARRAY);

  // this is the returned value
  const [selectedValue, setSelectedValue] = React.useState<T>(selectValue);

  React.useEffect(onWatchedKeysChange, watchedKeys);


  return selectedValue;

  function watchUnmount() {
    return function markUnmount() {
      manager.didUnmount = true;
    }
  }

  function onWatchedKeysChange() {
    const watchedKeysMap = Object.create(null);
    watchedKeys.forEach(subscribeToAsyncState);

    const unwatchGlobal = contextValue.watchAll(onAsyncStateChange);

    // may be this on update should only be called when we missed a notification
    // about a pending instance change
    onUpdate();
    return cleanup;

    // used to update the state selected value
    // it maps over watchedKeys to select them from context
    // and conclude with a value
    function onUpdate() {
      const newValue = selectValue();
      setSelectedValue(old => areEqual(old, newValue) ? old : newValue);
    }

    // if a hoist occurs with an already existing key and overrides it
    // or also if a new thing that may not interest us has been hoisted
    // this is necessary in case the used keys are a dynamic function's return
    function onAsyncStateChange(newValue: AsyncStateInterface<any>, key) {
      // we are not interested in anything we aren't expecting
      if (!watchedKeysMap[key]) {
        return;
      }

      const existingSubscription = manager.subscriptions[key];

      if (!existingSubscription) {
        return;
      }

      // if we were waiting for this async state
      if (existingSubscription && !existingSubscription.asyncState) {
        existingSubscription.asyncState = newValue;
        manager.subscriptions[key].cleanup = newValue.subscribe(onUpdate);

        onUpdate();
        return;
      }

      // if the previous instance changed
      if (newValue !== existingSubscription.asyncState) {
        invokeIfPresent(existingSubscription.cleanup);
        delete manager.subscriptions[key];

        manager.subscriptions[key] = Object.create(null);
        manager.subscriptions[key].asyncState = newValue;
        manager.subscriptions[key].cleanup = newValue.subscribe(onUpdate);

        onUpdate();
        return;
      }
    }

    function subscribeToAsyncState(key) {
      watchedKeysMap[key] = true;
      // if we start watching a key
      // we should check if it exists in the context,
      // if existing, we simply subscribe to it;
      // or else, we watch over it until it becomes available
      if (!manager.subscriptions[key]) {
        const asyncStateSubscription: SelectorSubscription<any> = Object.create(null);

        const asyncState: AsyncStateInterface<any> = contextValue.get(key);
        asyncStateSubscription.asyncState = asyncState;

        if (asyncState) {
          asyncStateSubscription.cleanup = asyncState.subscribe(onUpdate);
        } else {
          asyncStateSubscription.cleanup = contextValue.watch(key, onAsyncStateChange);
        }
        manager.subscriptions[key] = asyncStateSubscription;
      } else {
        const asyncState: AsyncStateInterface<any> = contextValue.get(key);
        const existing: SelectorSubscription<any> = manager.subscriptions[key];

        if (asyncState !== existing.asyncState) {
          invokeIfPresent(existing.cleanup);
          delete manager.subscriptions[key];

          manager.subscriptions[key] = Object.create(null);
          manager.subscriptions[key].asyncState = asyncState;
          manager.subscriptions[key].cleanup = asyncState.subscribe(onUpdate);
        }
      }
    }

    function cleanup() {
      unwatchGlobal();

      Object
        .entries(manager.subscriptions)
        .forEach(([key, subscription]) => {
          if (manager.didUnmount || !watchedKeysMap[key]) {
            invokeIfPresent(subscription.cleanup);
            delete manager.subscriptions[key];
          }
        });
    }
  }

  function selectValue(): T {
    const shouldReduceToObject = typeof keys === "function";

    return contextValue.select(watchedKeys, selector, shouldReduceToObject);
  }

  function readKeys(): string[] {
    return readSelectorKeys(keys, contextValue.getAllKeys);
  }
}

function readSelectorKeys(
  keys: SelectorKeysArg,
  availableKeysGetter: () => AsyncStateKey[]
): AsyncStateSelectorKeys {
  if (typeof keys === "string") {
    return [keys]; // optimize this
  }
  if (Array.isArray(keys)) {
    return keys;
  }
  if (typeof keys === "function") {
    const availableKeys = availableKeysGetter();
    return readSelectorKeys(keys(availableKeys), availableKeysGetter);
  }
  return [keys];
}

function newSelectorManager() {
  const output = Object.create(null);

  output.didUnmount = false;
  output.subscriptions = Object.create(null);

  output.has = function has(key) {
    return !!output.subscriptions[key];
  }

  return output;
}
