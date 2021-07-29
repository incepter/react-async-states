import React from "react";
import { AsyncStateContext } from "../context";
import useRawAsyncState from "./useRawAsyncState";
import { EMPTY_OBJECT } from "../../utils";
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
  const {fork, hoistToProvider, promiseConfig} = configuration;

  // early decide that this is a listener and return it immediately
  // because this is the most common use case that it will be, we'll be optimizing this path first
  if (existsInProvider && !hoistToProvider && !fork) {
    return AsyncStateSubscriptionMode.LISTEN;
  }

  if (promiseConfig && !hoistToProvider && !fork) { // we have a promiseConfig and we dont want to hoist or fork
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
  const [guard, setGuard] = React.useState(EMPTY_OBJECT);
  const contextValue = React.useContext(AsyncStateContext);
  const {key} = configuration;

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
        return new AsyncState({ key, ...configuration.promiseConfig});
      case AsyncStateSubscriptionMode.NOOP:
        return null;
      default:
        return candidate;
    }
  }, dependenciesArray);

  // wait early
  React.useLayoutEffect(function waitForIfUndefined() {
    if (AsyncStateSubscriptionMode.WAITING === subscriptionMode) {
      return contextValue.waitFor(key, function notify() {
        setGuard({});
      });
    }
    return undefined;
  }, [asyncState]);


  function run() {
    switch (subscriptionMode) {
      case AsyncStateSubscriptionMode.STANDALONE:
        return asyncState.run();
      case AsyncStateSubscriptionMode.FORK:
      case AsyncStateSubscriptionMode.HOIST:
        return contextValue.run(asyncState);
      // NoOp
      case AsyncStateSubscriptionMode.NOOP:
      case AsyncStateSubscriptionMode.WAITING:
      case AsyncStateSubscriptionMode.LISTEN:
      default:
        return undefined;
    }
  }


  return useRawAsyncState(asyncState, dependencies, configuration, run);
}

function NoOp() {
}

const waitingAsyncState = new AsyncState({
  key: Symbol("waiting_async_state"),
  promise() {
    return new Promise(NoOp);
  }
});
