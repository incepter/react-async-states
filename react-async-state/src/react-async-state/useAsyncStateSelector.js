import React from "react";
import { AsyncStateContext } from "./context";
import { invokeIfPresent } from "../utils";

export function useAsyncStateSelector(keys, selector, areEqual, defaultValue) {
  const currentValue = React.useRef(defaultValue);
  const [, rerender] = React.useState();
  const {get} = React.useContext(AsyncStateContext);

  const effectiveKeys = typeof keys === "string" ? [keys] : keys; // assumes keys is an array of string, check to add
  const oldCleanups = React.useMemo(function selectorImplementation() {
    invokeIfPresent(oldCleanups);

    const asyncStates = effectiveKeys.map(get);

    function rerunSelector() {
      const values = asyncStates.map(function subscribeAndUnsubscribe(asyncState) {
        if (!asyncState) {
          // may be throw ? undefined for now
          return undefined;
        }
        return asyncState.currentState;
      });
      const newSelectedValue = selector(...values);
      let didSelectedValueChange = !areEqual(currentValue.current, newSelectedValue);
      if (didSelectedValueChange) {
        currentValue.current = newSelectedValue;
        rerender({});
      }
    }

    function subscribe(asyncState) {
      return asyncState.subscribe(function subscription() {
        rerunSelector();
      });
    }

    return asyncStates.map(subscribe);
  }, [...effectiveKeys, selector]);

  return currentValue.current;
}
