import React from "react";
import useRerender from "../utils/useRerender";
import { defaultRerenderStatusConfig, makeReturnValueFromAsyncState } from "./subscriptionUtils";
import { EMPTY_OBJECT, invokeIfPresent } from "../../utils";

const defaultConfiguration = Object.freeze({
  lazy: false,
  condition: true,
  payload: EMPTY_OBJECT,
  rerenderStatus: defaultRerenderStatusConfig,
});

export default function useRawAsyncState(asyncState, dependencies, configuration = defaultConfiguration, run) {
  const rerender = useRerender();
  const returnValue = React.useRef();
  const previousAsyncState = React.useRef();

  React.useEffect(function onAsyncStateChange() {
    let abort;
    let unsubscribe;
    const {rerenderStatus, condition} = configuration;

    function runCurrentAsyncState() {
      if (typeof run === "function") {
        return run();
      }
      return asyncState.run();
    }

    const rerenderStatusConfig = {...defaultRerenderStatusConfig, ...(rerenderStatus ?? EMPTY_OBJECT)};
    // subscribe only when instance change
    if (previousAsyncState.current !== asyncState) {
      previousAsyncState.current = asyncState;
      unsubscribe = asyncState.subscribe(function onUpdate(newState) {
        if (rerenderStatusConfig[newState.status]) {
          returnValue.current = makeReturnValueFromAsyncState(asyncState);
          rerender({});
        }
      });
      if (!asyncState.config.lazy) {
        abort = runCurrentAsyncState();
      }
    }

    // abort may be truthy if condition is truthy and not lazy
    if (condition && !abort) {
      abort = runCurrentAsyncState();
    }


    function cleanup() {
      invokeIfPresent(abort);
      // if whatever current value is no longer this aged asyncState, dispose the old
      if (previousAsyncState.current !== asyncState) {
        invokeIfPresent(unsubscribe);
        asyncState.dispose();
      }
    }

    return cleanup;
  }, dependencies);

  if (!returnValue.current) {
    returnValue.current = makeReturnValueFromAsyncState(asyncState);
  }

  return returnValue.current;
}
