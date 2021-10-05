import React from "react";
import { EMPTY_OBJECT, shallowClone } from "shared";
import { defaultRerenderStatusConfig } from "../utils/subscriptionUtils";

export default function useRawAsyncState(asyncState, dependencies, configuration, run, dispose, runAsyncState) {
  const returnValue = React.useRef();
  const rerender = React.useState(EMPTY_OBJECT)[1];

  // whenever the async state changes, synchronously make the return value a null
  React.useMemo(function onAsyncStateChangeSync() {
    returnValue.current = null;
  }, [asyncState]);

  // if rendering with a null value, construct the return value
  if (!returnValue.current) {
    returnValue.current = {};
    const calculatedState = calculateSelectedState(asyncState.currentState, asyncState.lastSuccess, configuration);
    applyUpdateOnReturnValue(returnValue.current, asyncState, calculatedState, run, runAsyncState);
  }

  // the subscription to state change along with the decision to re-render
  React.useLayoutEffect(function subscribeToAsyncState() {
    if (!asyncState) {
      return undefined;
    }
    const {rerenderStatus} = configuration;
    const rerenderStatusConfig = shallowClone(defaultRerenderStatusConfig, rerenderStatus);

    return asyncState.subscribe(function onUpdate(newState) {
      const calculatedState = calculateSelectedState(newState, asyncState.lastSuccess, configuration);
      const prevStateValue = returnValue.current.state;
      applyUpdateOnReturnValue(returnValue.current, asyncState, calculatedState, run, runAsyncState);

      if (!rerenderStatusConfig[newState.status]) {
        return;
      }

      const {areEqual} = configuration;
      if (!areEqual(prevStateValue, calculatedState)) {
        rerender({});
      }
    });
  }, [...dependencies, asyncState]);

  // attempt to dispose/reset old async state
  // this case is rare and will happen if you have changing props declared as dependencies
  React.useEffect(function disposeOldAsyncState() {
    return function cleanup() {
      if (typeof dispose === "function") {
        dispose(asyncState);
      } else if (asyncState) {
        asyncState.dispose();
      }
    }
  }, [asyncState]);

  // automatic run if not marked as lazy
  React.useEffect(function autoRunAsyncState() {
    if (!asyncState || !configuration.condition || asyncState.config.lazy || configuration.lazy) {
      return undefined;
    }

    asyncState.payload = shallowClone(asyncState.payload, configuration.payload);
    if (typeof run === "function") {
      return run();
    }
    return asyncState.run();
  }, dependencies);

  return returnValue.current;
}

function calculateSelectedState(newState, lastSuccess, configuration) {
  const {selector} = configuration;
  return typeof selector === "function" ? selector(newState, lastSuccess) : newState;
}

function applyUpdateOnReturnValue(returnValue, asyncState, stateValue, run, runAsyncState) {
  returnValue.source = asyncState._source;

  returnValue.state = stateValue;
  returnValue.payload = asyncState.payload;
  returnValue.lastSuccess = asyncState.lastSuccess;

  returnValue.key = asyncState.key;

  if (!returnValue.mergePayload) {
    returnValue.mergePayload = function mergePayload(newPayload) {
      asyncState.payload = shallowClone(asyncState.payload, newPayload);
    }
  }

  if (!returnValue.run) {
    returnValue.run = typeof run === "function" ? run : asyncState.run.bind(asyncState);
  }
  if (!returnValue.abort) {
    returnValue.abort = asyncState.abort.bind(asyncState);
  }
  if (!returnValue.replaceState) {
    returnValue.replaceState = asyncState.replaceState.bind(asyncState);
  }
  if (!returnValue.runAsyncState) {
    returnValue.runAsyncState = runAsyncState;
  }
}
