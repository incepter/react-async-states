import React from "react";
import { EMPTY_ARRAY, EMPTY_OBJECT, shallowClone } from "shared";
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
import { nextKey, readUserConfiguration } from "./utils/readConfig";
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

export const useAsyncStateImpl = function useAsyncStateImpl(subscriptionConfig, dependencies = EMPTY_ARRAY, configOverrides = EMPTY_OBJECT) {
  const contextValue = React.useContext(AsyncStateContext);

  // the default value of AsyncStateContext is set to null
  const isInsideProvider = contextValue !== null;
  const runAsyncState = contextValue?.runAsyncState;

  // stateDeps and refs are merged into one to minimize the count of used hooks
  const factory = React.useRef(EMPTY_OBJECT);
  const [stateDeps, setStateDeps] = React.useState(initialStateDependencies);

  // initialize the ref that will be mutated, the refsFactory shouldn't be put in useRef to avoid statically calling it
  if (factory.current === EMPTY_OBJECT) {
    factory.current = refsFactory();
  }

  // destructure important information to the render's closure
  const {mode, asyncState, configuration, run, dispose} = React.useMemo(function readConfiguration() {
    const newConfig = readUserConfiguration(subscriptionConfig, configOverrides);
    const newMode = inferSubscriptionMode(contextValue, newConfig);

    if (newConfig.key === undefined && newConfig.source?.key === undefined) {
      newConfig.key = nextKey();
    }

    const {guard} = stateDeps;
    const recalculateInstance = shouldRecalculateInstance(newConfig, newMode, guard, dependencies, factory.current.subscriptionInfo);

    let output = {
      guard,
      mode: newMode,
      deps: dependencies,
      configuration: newConfig,
    };

    if (recalculateInstance) {
      output.asyncState = inferAsyncStateInstance(newMode, newConfig, contextValue);
    } else {
      // reuse old instance only
      output.asyncState = factory.current.subscriptionInfo.asyncState;
    }

    if (output.asyncState) {
      if (!output.asyncState.payload) {
        output.asyncState.payload = Object.create(null);
      }
      // merge the payload in the async state immediately to benefit from its power
      output.asyncState.payload = Object.assign(output.asyncState.payload, contextValue?.payload, newConfig.payload);
    }
    output.run = runAsyncStateSubscriptionFn(newMode, output.asyncState, newConfig, contextValue);
    output.dispose = disposeAsyncStateSubscriptionFn(newMode, output.asyncState, newConfig, contextValue);

    // if the calculated async state instance changed
    if (output.asyncState !== factory.current.subscriptionInfo?.asyncState) {
      // whenever the async state changes, synchronously make the return value a new object
      // it is like a synchronous effect that applies a mutation and does not have a cleanup
      factory.current.returnValue = undefined;
    }
    // store the current subscription info in the ref
    // it will be used in case something triggering this memo again to decide whether we should recalculate the instance or not
    factory.current.subscriptionInfo = output;

    return output;
  }, [contextValue, stateDeps.guard, ...dependencies]);

  // it is okay to use hooks inside this condition
  // because if it changes, react will throw the old tree to gc
  if (isInsideProvider) {
    // this sets  a watcher to observe present async state
    React.useEffect(function watchAsyncState() {
      let didClean = false;

      // if we are waiting and do not have an asyncState
      // this case occurs if this component renders before the component hoisting the state
      // the notifyWatchers is scheduled via microTaskQueue, that occurs after the layoutEffect
      // and before is effect that should watch over a state. This means that we will miss the notification about
      // the awaited state, so, if we are waiting without an asyncState, schedule a memo recalculation
      if (mode === AsyncStateSubscriptionMode.WAITING && !asyncState) {
        let candidate = contextValue.get(configuration.key);
        if (candidate) {
          // schedule the recalculation of the memo to infer the new async state instance and quit
          setStateDeps(old => ({guard: {}, rerender: old.rerender}));
          return;
        }
      }

      switch (mode) {
        // if this component is the one hoisting a state, re-notify watchers that may missed the notification for some reason
        // this case is not likely to occur, but this is like a safety check that notify the watchers
        // and quit because i don't think the hoister should watch over itself, at least for now!
        case AsyncStateSubscriptionMode.HOIST: {
          contextValue.notifyWatchers(asyncState.key, asyncState);
          return;
        }
        case AsyncStateSubscriptionMode.FORK:
        case AsyncStateSubscriptionMode.WAITING:
        case AsyncStateSubscriptionMode.LISTEN: {
          let watchedKey = AsyncStateSubscriptionMode.WAITING === mode ? configuration.key : asyncState?.key;
          const unwatch = contextValue.watch(watchedKey, function notify(mayBeNewAsyncState) {
            if (didClean) {
              return;
            }
            // only trigger a rerender if the newAsyncState is different from what we have
            if (mayBeNewAsyncState !== asyncState) {
              setStateDeps(old => ({guard: {}, rerender: old.rerender}));
            }
          });
          return function cleanup() {
            didClean = true;
            unwatch();
          };
        }
        // don't watch on these modes
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
  // this is important to be after the memo calculation that may set this value to undefined in case of instance change
  if (!factory.current.returnValue) {
    factory.current.returnValue = Object.create(null); // inherit nothing
    if (asyncState) {
      const calculatedState = calculateSelectedState(asyncState, asyncState.currentState, asyncState.lastSuccess, configuration);
      applyUpdateOnReturnValue(factory.current.returnValue, asyncState, calculatedState, run, runAsyncState, mode);
    }
  }

  // the subscription to state updates along with the decision to re-render
  React.useEffect(function subscribeToAsyncState() {
    if (!asyncState) {
      return undefined;
    }
    const {rerenderStatus} = configuration;
    const rerenderStatusConfig = shallowClone(defaultRerenderStatusConfig, rerenderStatus);

    // the subscribe function returns the unsubscribe function, that serves as cleanup
    return asyncState.subscribe(function onUpdate(newState) {
      const calculatedState = calculateSelectedState(asyncState, newState, asyncState.lastSuccess, configuration);
      const prevStateValue = factory.current.returnValue.state;
      applyUpdateOnReturnValue(factory.current.returnValue, asyncState, calculatedState, run, runAsyncState, mode);

      if (!rerenderStatusConfig[newState.status]) {
        return;
      }

      const {areEqual} = configuration;
      if (!areEqual(prevStateValue, calculatedState)) {
        setStateDeps(old => ({rerender: {}, guard: old.guard}));
      }
    }, configuration.subscriptionKey);

  }, [...dependencies, asyncState]); // re-subscribe if deps

  React.useEffect(function autoRun() {
    const shouldAutoRun = configuration.condition && !configuration.lazy;
    // run() returns its abort callback
    return shouldAutoRun ? run() : undefined;
  }, dependencies)

  // attempt to dispose/reset old async state
  React.useEffect(function disposeOldAsyncState() {
    return dispose;
  }, [dispose]);

  return factory.current.returnValue;
}
