import React from "react";
import { EMPTY_ARRAY, EMPTY_OBJECT, invokeIfPresent, shallowClone } from "shared";
import { AsyncStateContext } from "../context";
import {
  applyUpdateOnReturnValue, getVoidOnReturnValue,
  AsyncStateSubscriptionMode,
  calculateSelectedState,
  defaultRerenderStatusConfig,
  inferAsyncStateInstance,
  inferSubscriptionMode,
  shouldRecalculateInstance
} from "./utils/subscriptionUtils";
import { readUserConfiguration } from "./utils/readConfig";
import { disposeAsyncStateSubscriptionFn, runAsyncStateSubscriptionFn } from "./utils/asyncStateSubscription";

// guard: if inside provider, and subscription occurred before hoist, component may wait and uses this to trigger recalculation
// rerender: when async state updates and value change, if we should rerender (areEqual = false) => rerender
const initialStateDependencies = Object.freeze({rerender: EMPTY_OBJECT, guard: EMPTY_OBJECT});

function refsFactory() {
  return {
    returnValue: undefined,
    subscriptionInfo: undefined,
  };
}

export function useAsyncState(subscriptionConfig, dependencies = EMPTY_ARRAY) {
  const contextValue = React.useContext(AsyncStateContext);

  const isInsideProvider = contextValue !== null;
  const runAsyncState = contextValue?.runAsyncState;

  const refs = React.useRef(EMPTY_OBJECT);
  const [stateDeps, setStateDeps] = React.useState(initialStateDependencies);

  if (refs.current === EMPTY_OBJECT) {
    refs.current = refsFactory();
  }

  const {mode, asyncState, configuration, run, dispose} = React.useMemo(function readConfiguration() {
    const newConfig = readUserConfiguration(subscriptionConfig);
    const newMode = inferSubscriptionMode(contextValue, newConfig);

    const {guard} = stateDeps;
    const recalculateInstance = shouldRecalculateInstance(newConfig, newMode, guard, dependencies, refs.current.subscriptionInfo);

    let output = {
      guard,
      mode: newMode,
      deps: dependencies,
      configuration: newConfig,
    };

    if (recalculateInstance) {
      output.asyncState = inferAsyncStateInstance(newMode, newConfig, contextValue);
    } else {
      output.asyncState = refs.current.subscriptionInfo.asyncState;
    }

    if (output.asyncState) {
      if (!output.asyncState.payload) {
        output.asyncState.payload = Object.create(null);
      }
      output.asyncState.payload = Object.assign(output.asyncState.payload, contextValue?.payload, newConfig.payload);
    }
    output.run = runAsyncStateSubscriptionFn(newMode, output.asyncState, newConfig, contextValue);
    output.dispose = disposeAsyncStateSubscriptionFn(newMode, output.asyncState, newConfig, contextValue);

    // the calculated async state instance changed
    if (output.asyncState !== refs.current.subscriptionInfo?.asyncState) {
      // whenever the async state changes, synchronously make the return value a new object
      // it is like a synchronous effect that applies a mutation and does not have a cleanup
      refs.current.returnValue = undefined;
    }

    refs.current.subscriptionInfo = output;

    return output;
  }, [contextValue, stateDeps.guard, ...dependencies]);

  // it is okay to use hooks inside this condition
  // because if it changes, react will throw the old tree to gc
  if (isInsideProvider) {
    // wait early
    // this sets  a watcher to observe present async state
    React.useLayoutEffect(function watchAsyncState() {
      switch (mode) {
        case AsyncStateSubscriptionMode.FORK:
        case AsyncStateSubscriptionMode.HOIST:
        case AsyncStateSubscriptionMode.WAITING:
        case AsyncStateSubscriptionMode.LISTEN: {
          let watchedKey = AsyncStateSubscriptionMode.WAITING === mode
            ? configuration.key
            :
            asyncState?.key;

          return contextValue.watch(watchedKey, function notify(newValue) {
            if (newValue !== asyncState) {
              setStateDeps(old => ({guard: {}, rerender: old.rerender}));
            }
          });
        }
        case AsyncStateSubscriptionMode.NOOP:
        case AsyncStateSubscriptionMode.SOURCE:
        case AsyncStateSubscriptionMode.STANDALONE:
        case AsyncStateSubscriptionMode.OUTSIDE_PROVIDER:
        default:
          return undefined;
      }
    }, [mode, asyncState, configuration.key]);
  }

  // if rendering with an undefined value, construct the return value
  if (!refs.current.returnValue) {
    refs.current.returnValue = Object.create(null); // inherit nothing
    if (asyncState) {
      const calculatedState = calculateSelectedState(asyncState.currentState, asyncState.lastSuccess, configuration);
      applyUpdateOnReturnValue(refs.current.returnValue, asyncState, calculatedState, run, runAsyncState);
    }
  }

  // the subscription to state change along with the decision to re-render
  React.useLayoutEffect(function subscribeToAsyncState() {
    if (!asyncState) {
      return undefined;
    }
    const {rerenderStatus} = configuration;
    const rerenderStatusConfig = shallowClone(defaultRerenderStatusConfig, rerenderStatus);

    const unsubscribe = asyncState.subscribe(function onUpdate(newState) {
      const calculatedState = calculateSelectedState(newState, asyncState.lastSuccess, configuration);
      const prevStateValue = refs.current.returnValue.state;
      applyUpdateOnReturnValue(refs.current.returnValue, asyncState, calculatedState, run, runAsyncState);

      if (!rerenderStatusConfig[newState.status]) {
        return;
      }

      const {areEqual} = configuration;
      if (!areEqual(prevStateValue, calculatedState)) {
        setStateDeps(old => ({rerender: {}, guard: old.guard}));
      }
    }, configuration.subscriptionKey);

    const shouldAutoRun = configuration.condition && !configuration.lazy;
    const abort = shouldAutoRun ? run() : undefined;

    return function abortAndUnsubscribe() {
      unsubscribe();
      invokeIfPresent(abort);
    }
  }, [...dependencies, asyncState]); // re-subscribe if deps

  // attempt to dispose/reset old async state
  React.useEffect(function disposeOldAsyncState() {
    return function cleanup() {
      invokeIfPresent(dispose);
    }
  }, [dispose]);

  return refs.current.returnValue;
}
