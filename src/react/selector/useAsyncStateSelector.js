import React from "react";
import { AsyncStateContext } from "../context";
import { identity, invokeIfPresent, shallowEqual } from "../../shared";

export function useAsyncStateSelector(keys, selector = identity, areEqual = shallowEqual, initialValue = undefined) {
  const effectiveKeys = Array.isArray(keys) ? keys : [keys];
  const {get, watch, dispose, select} = React.useContext(AsyncStateContext);

  const [returnValue, setReturnValue] = React.useState(function getInitialState() {
    return selectValues() || initialValue;
  });

  function selectValues() {
    const selectedValue = select(effectiveKeys, selector);

    if (!areEqual(returnValue, selectedValue)) {
      return selectedValue;
    }
    return returnValue;
  }

  React.useLayoutEffect(function cleanOldSubscriptions() {
    let cleanups = [];

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
