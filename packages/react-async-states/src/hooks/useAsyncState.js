import React from "react";
import { EMPTY_ARRAY, EMPTY_OBJECT, invokeIfPresent, shallowClone } from "shared";
import { AsyncStateContext } from "../context";
import {
  applyUpdateOnReturnValue,
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
    const configuration = readUserConfiguration(subscriptionConfig);
    const mode = inferSubscriptionMode(contextValue, configuration);

    const {guard} = stateDeps;
    const recalculateInstance = shouldRecalculateInstance(configuration, mode, guard, refs.current.subscriptionInfo);

    let output = {
      mode,
      guard,
      configuration,
      deps: dependencies,
    };
    if (recalculateInstance) {
      output.asyncState = inferAsyncStateInstance(mode, configuration, contextValue);
      // output = {configuration, guard, ...asyncStateSubscription(contextValue, mode, configuration), deps: dependencies};
    } else {
      output.asyncState = refs.current.subscriptionInfo.asyncState;
    }

    output.asyncState.payload = shallowClone(output.asyncState.payload, configuration.payload);
    output.run = runAsyncStateSubscriptionFn(mode, output.asyncState, configuration, contextValue);
    output.dispose = disposeAsyncStateSubscriptionFn(mode, output.asyncState, configuration, contextValue);

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
    const calculatedState = calculateSelectedState(asyncState.currentState, asyncState.lastSuccess, configuration);
    applyUpdateOnReturnValue(refs.current.returnValue, asyncState, calculatedState, run, runAsyncState);
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
      const prevStateValue = refs.current.returnValue.state;
      applyUpdateOnReturnValue(refs.current.returnValue, asyncState, calculatedState, run, runAsyncState);

      if (!rerenderStatusConfig[newState.status]) {
        return;
      }

      const {areEqual} = configuration;
      if (!areEqual(prevStateValue, calculatedState)) {
        setStateDeps(old => ({rerender: {}, guard: old.guard}));
      }
    });
  }, [...dependencies, asyncState]); // re-subscribe if deps

  React.useEffect(function autoRunAsyncState() {
    if (!asyncState || !configuration.condition || asyncState.config.lazy || configuration.lazy) {
      return undefined;
    }

    return run();
  }, dependencies);

  // attempt to dispose/reset old async state
  React.useEffect(function disposeOldAsyncState() {
    return function cleanup() {
      invokeIfPresent(dispose);
    }
  }, [dispose]);

  return refs.current.returnValue;
}
