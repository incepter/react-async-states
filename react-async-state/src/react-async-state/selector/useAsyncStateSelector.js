import React from "react";
import { AsyncStateContext } from "../context";
import { invokeIfPresent } from "../../utils";
import useRerender from "../utils/useRerender";

function shallowEqual(prev, next) {
  return prev === next;
}

function extractCurrentState(asyncState) {
  return asyncState?.currentState;
}

export function useAsyncStateSelector(keys, selector, areEqual = shallowEqual, defaultValue = undefined) {
  const rerender = useRerender();
  const selectorValue = React.useRef(defaultValue);

  const {get} = React.useContext(AsyncStateContext);
  const effectiveKeys = typeof keys === "string" ? [keys] : keys; // assumes keys is an array of string, check to add

  const unsubscriptions = React.useMemo(function selectorImplementation() {
    const asyncStates = effectiveKeys.map(get);

    function rerunSelector() {
      const selectedValue = selector(...asyncStates.map(extractCurrentState));

      if (!areEqual(selectorValue.current, selectedValue)) {
        selectorValue.current = selectedValue;
        rerender({});
      }
    }

    function subscribe(asyncState) {
      return asyncState.subscribe(rerunSelector);
    }

    return asyncStates.map(subscribe);
  }, [...effectiveKeys, selector]);

  React.useEffect(function cleanOldSubscriptions() {
    if (!unsubscriptions || !unsubscriptions.length) {
      return undefined;
    }
    return function invokeOldCleanups() {
      unsubscriptions.forEach(invokeIfPresent);
    };
  }, [unsubscriptions]);

  return selectorValue.current;
}
