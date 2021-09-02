import React from "react";
import { AsyncStateContext } from "../context";
import { identity, invokeIfPresent, shallowEqual } from "../../shared";

function readSelectorKeys(keys, availableKeys) {
  if (typeof keys === "string") {
    return [keys]; // optimize this
  }
  if (Array.isArray(keys)) {
    return keys;
  }
  if (typeof keys === "function") {
    return readSelectorKeys(keys(availableKeys), availableKeys);
  }
  return [keys];
}

export function useAsyncStateSelector(keys, selector = identity, areEqual = shallowEqual, initialValue = undefined) {
  const {get, watch, dispose, select, getAllKeys, watchAll} = React.useContext(AsyncStateContext);

  const effectiveKeys = React.useMemo(function deduceKeys() {
    return readSelectorKeys(keys, getAllKeys());
  }, [keys, getAllKeys]);

  const [returnValue, setReturnValue] = React.useState(function getInitialState() {
    return selectValues() || initialValue;
  });

  function selectValues() {
    const reduceToObject = typeof keys === "function";
    const selectedValue = select(effectiveKeys, selector, reduceToObject);

    if (!areEqual(returnValue, selectedValue)) {
      return selectedValue;
    }
    return returnValue;
  }

  React.useLayoutEffect(function watchAndSubscribeAndCleanOldSubscriptions() {
    let cleanups = [];

    if (typeof keys === "function") {
      cleanups.push(watchAll(function onSomethingHoisted() {
        setReturnValue(selectValues());
      }));
    }

    function watcher(newValue) {
      if (newValue) {
        // appearance
        cleanups.push(newValue.subscribe(subscription));
        cleanups.push(function disposeAs() {dispose(newValue)});
      }
      // disappearances should not occur because they are being watched from here
      setReturnValue(selectValues());
    }

    function subscription() {
      setReturnValue(selectValues());
    }

    effectiveKeys.forEach(function subscribeOrWaitFor(key) {
      const asyncState = get(key);
      cleanups.push(watch(key, watcher)); // watch for the key
      if (asyncState) {
        cleanups.push(asyncState.subscribe(subscription));
        cleanups.push(function disposeAs() {dispose(asyncState)});
      }
    });

    return function invokeOldCleanups() {
      cleanups.forEach(invokeIfPresent);
    };
  }, [...effectiveKeys, selector]);

  return returnValue;
}
