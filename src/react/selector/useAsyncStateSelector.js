import React from "react";
import { AsyncStateContext } from "../context";
import { identity, invokeIfPresent, shallowEqual } from "../../shared";

export function useAsyncStateSelector(keys, selector = identity, areEqual = shallowEqual, initialValue = undefined) {
  const effectiveKeys = typeof keys === "string" ? [keys] : keys; // assumes keys is an array of string, check to add
  const {get, watch, dispose} = React.useContext(AsyncStateContext);

  const [returnValue, setReturnValue] = React.useState(function getInitialState() {
    return selectValues() || initialValue;
  });


  function selectValues() {
    const selectedValue = selector(...effectiveKeys.map(function extractCurrentState(key) {
      const candidate = get(key);
      if (!candidate) {
        return undefined;
      }
      return candidate.currentState;
    }));

    if (!areEqual(returnValue, selectedValue)) {
      return selectedValue;
    }
    return returnValue;
  }

  React.useEffect(function cleanOldSubscriptions() {
    let cleanups = [];

    function subscription() {
      setReturnValue(selectValues());
    }

    effectiveKeys.forEach(function subscribeOrWaitFor(key) {
      const asyncState = get(key);
      cleanups.push(watch(key, subscription)); // watch for the key
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
