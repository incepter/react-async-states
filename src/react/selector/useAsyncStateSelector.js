import React from "react";
import { AsyncStateContext } from "../context";
import { invokeIfPresent } from "../../shared";

function shallowEqual(prev, next) {
  return prev === next;
}
function identity(...args) {
  if (!args || !args.length) {
    return undefined;
  }
  return args.length === 1 ? args[0] : args;
}

export function useAsyncStateSelector(keys, selector = identity, areEqual = shallowEqual, initialValue = undefined) {

  const {get, waitFor, dispose} = React.useContext(AsyncStateContext);
  const effectiveKeys = typeof keys === "string" ? [keys] : keys; // assumes keys is an array of string, check to add

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
      if (!asyncState) {
        cleanups.push(waitFor(key, subscription));
      } else {
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
