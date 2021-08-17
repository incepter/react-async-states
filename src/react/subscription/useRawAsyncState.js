import React from "react";
import useRerender from "../utils/useRerender";
import { defaultRerenderStatusConfig, makeReturnValueFromAsyncState } from "./subscriptionUtils";
import { EMPTY_OBJECT, invokeIfPresent, shallowClone } from "../../shared";

export default function useRawAsyncState(asyncState, dependencies, configuration, run, dispose, runAsyncState) {
  const rerender = useRerender();
  const returnValue = React.useRef();

  React.useLayoutEffect(function subscribeToAsyncState() {
    if (!asyncState) {
      return undefined;
    }
    const {rerenderStatus} = configuration;
    const rerenderStatusConfig = {...defaultRerenderStatusConfig, ...(rerenderStatus ?? EMPTY_OBJECT)};

    const unsubscribe = asyncState.subscribe(function onUpdate(newState) {
      returnValue.current = makeReturnValueFromAsyncState(asyncState, run, runAsyncState);
      if (rerenderStatusConfig[newState.status]) {
        rerender({});
      }
    });
    return function cleanup() {
      invokeIfPresent(unsubscribe);
      if (typeof dispose === "function") {
        dispose(asyncState);
      } else {
        asyncState.dispose();
      }
    };
  }, [asyncState]);

  React.useEffect(function runAsyncState() {
    if (!asyncState || !configuration.condition || asyncState.config.lazy) {
      return undefined;
    }

    asyncState.payload = shallowClone(asyncState.payload, configuration.payload);
    if (typeof run === "function") {
      return run();
    }
    return asyncState.run();
  }, dependencies);

  if (!returnValue.current) {
    returnValue.current = makeReturnValueFromAsyncState(asyncState, run, runAsyncState);
  }

  return returnValue.current;
}
