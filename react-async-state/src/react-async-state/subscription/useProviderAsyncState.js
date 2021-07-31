import React from "react";
import { AsyncStateContext } from "../context";
import useRawAsyncState from "./useRawAsyncState";
import { EMPTY_OBJECT, invokeIfPresent } from "../../utils";
import AsyncState from "../../async-state/AsyncState";

const AsyncStateSubscriptionMode = Object.freeze({
  LISTEN: 0, // simple listener
  HOIST: 1, // hoisting a promise, for first time and intended to be shared, more like of an injection
  STANDALONE: 2, // working standalone even if inside provider
  WAITING: 3, // waits for the original to be hoisted

  FORK: 4, // forking an existing one in the provider
  NOOP: 5, // a weird case that should not happen
});

function inferSubscriptionMode(existsInProvider, configuration) {
  const {fork, hoistToProvider} = configuration;

  // early decide that this is a listener and return it immediately
  // because this is the most common use case that it will be, we'll be optimizing this path first
  if (existsInProvider && !hoistToProvider && !fork) {
    return AsyncStateSubscriptionMode.LISTEN;
  }

  if (!hoistToProvider && !fork) { // we dont want to hoist or fork
    return AsyncStateSubscriptionMode.STANDALONE;
  }

  if (hoistToProvider && (!existsInProvider || !fork)) { // we want to hoist while (not in provider or we dont want to fork)
    return AsyncStateSubscriptionMode.HOIST;
  }

  if (fork && existsInProvider) { // fork a hoisted
    return AsyncStateSubscriptionMode.FORK;
  }

  if (!existsInProvider) { // not found in provider; so either a mistake, or still not hoisted from
    return AsyncStateSubscriptionMode.WAITING; // waiting, or may be we should throw ?
  }

  return AsyncStateSubscriptionMode.NOOP; // we should not be here

}

export default function useProviderAsyncState(configuration, dependencies) {
  const {key} = configuration;
  const [guard, setGuard] = React.useState(EMPTY_OBJECT); // used to trigger the recalculation of the memo
  const contextValue = React.useContext(AsyncStateContext);

  const dependenciesArray = [guard, ...dependencies];

  const subscriptionMode = React.useMemo(function inferASSubscriptionMode() {
    let candidate = contextValue.get(key);
    return inferSubscriptionMode(!!candidate, configuration);
  }, dependenciesArray);

  const asyncState = React.useMemo(function inferAsyncState() {
    let candidate = contextValue.get(key);

    switch (subscriptionMode) {
      case AsyncStateSubscriptionMode.FORK:
        return contextValue.fork(key, configuration.forkConfig);
      case AsyncStateSubscriptionMode.HOIST:
        return contextValue.hoist(configuration);
      case AsyncStateSubscriptionMode.LISTEN:
        return candidate;
      case AsyncStateSubscriptionMode.WAITING:
        return waitingAsyncState;
      case AsyncStateSubscriptionMode.STANDALONE:
        return new AsyncState(key, configuration.promise, configuration.promiseConfig);
      case AsyncStateSubscriptionMode.NOOP:
        return null;
      default:
        return candidate;
    }
  }, dependenciesArray);

  // wait early
  React.useLayoutEffect(function waitForIfWaitingMode() {
    let waitingCleanup;
    if (AsyncStateSubscriptionMode.WAITING === subscriptionMode) {
      waitingCleanup = contextValue.waitFor(key, function notify() {
        setGuard({});
      });
    }

    return function cleanup() {
      invokeIfPresent(waitingCleanup);
    };
  }, [asyncState]);


  function run() {
    switch (subscriptionMode) {
      case AsyncStateSubscriptionMode.STANDALONE:
        return asyncState.run();
      case AsyncStateSubscriptionMode.FORK:
      case AsyncStateSubscriptionMode.HOIST:
      case AsyncStateSubscriptionMode.LISTEN:
        return contextValue.run(asyncState);
      // NoOp
      case AsyncStateSubscriptionMode.NOOP:
      case AsyncStateSubscriptionMode.WAITING:
      default:
        return undefined;
    }
  }
  function dispose() {
    switch (subscriptionMode) {
      case AsyncStateSubscriptionMode.STANDALONE:
        return asyncState.dispose();
      case AsyncStateSubscriptionMode.FORK:
      case AsyncStateSubscriptionMode.HOIST:
      case AsyncStateSubscriptionMode.LISTEN:
        return contextValue.dispose(asyncState);
      // NoOp
      case AsyncStateSubscriptionMode.NOOP:
      case AsyncStateSubscriptionMode.WAITING:
      default:
        return undefined;
    }
  }

  return useRawAsyncState(asyncState, dependencies, configuration, run, dispose);
}

function NoOp() {
}

const waitingAsyncState = new AsyncState(
  Symbol("waiting_async_state"),
  function promise() {
    return new Promise(NoOp);
  },
  {}
);
