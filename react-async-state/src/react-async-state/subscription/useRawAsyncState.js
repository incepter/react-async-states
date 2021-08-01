import React from "react";
import useRerender from "../utils/useRerender";
import { defaultRerenderStatusConfig, makeReturnValueFromAsyncState } from "./subscriptionUtils";
import { EMPTY_OBJECT, invokeIfPresent, mergeObjects } from "../../shared";

export default function useRawAsyncState(asyncState, dependencies, configuration, run, dispose) {
  const rerender = useRerender();
  const returnValue = React.useRef();

  React.useLayoutEffect(function subscribeToAsyncState() {
    if (!asyncState) {
      return undefined;
    }
    const {rerenderStatus} = configuration;
    const rerenderStatusConfig = {...defaultRerenderStatusConfig, ...(rerenderStatus ?? EMPTY_OBJECT)};

    const unsubscribe = asyncState.subscribe(function onUpdate(newState) {
      if (rerenderStatusConfig[newState.status]) {
        returnValue.current = makeReturnValueFromAsyncState(asyncState);
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

    asyncState.payload = mergeObjects(asyncState.payload, configuration.payload);
    if (typeof run === "function") {
      return run(asyncState);
    }
    return asyncState.run();
  }, dependencies);

  if (!returnValue.current) {
    returnValue.current = makeReturnValueFromAsyncState(asyncState);
  }

  return returnValue.current;
}
