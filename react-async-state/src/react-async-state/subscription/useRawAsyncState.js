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
let ha = 0;

export default function useRawAsyncState(asyncState, dependencies, configuration = defaultConfiguration) {
  const rerender = useRerender();
  const returnValue = React.useRef();
  const previousAsyncState = React.useRef();

  // console.log('3.', asyncState, dependencies)
  React.useEffect(function onAsyncStateChange() {
    let unsubscribe;
    const {rerenderStatus, condition} = configuration;

    const rerenderStatusConfig = {...defaultRerenderStatusConfig, ...(rerenderStatus ?? EMPTY_OBJECT)};
    // subscribe only when instance change
    if (previousAsyncState.current !== asyncState) {
      console.log('effect', asyncState.key);
      previousAsyncState.current = asyncState;
      unsubscribe = asyncState.subscribe(function onUpdate(newState) {
        if (rerenderStatusConfig[newState.status]) {
          returnValue.current = makeReturnValueFromAsyncState(asyncState);
          rerender({});
        }
      });
    }


    let abort;
    if (condition) {
      abort = asyncState.run();
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
