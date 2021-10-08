import AsyncState from "async-state";
import { EMPTY_OBJECT, oneObjectIdentity, shallowClone, shallowEqual } from "shared";
import { readAsyncStateFromSource } from "async-state/utils";

export const defaultRerenderStatusConfig = Object.freeze({
  error: true,
  success: true,
  aborted: true,
  pending: true,
});

export const AsyncStateSubscriptionMode = Object.freeze({
  LISTEN: 0, // simple listener
  HOIST: 1, // hoisting a promise, for first time and intended to be shared, more like of an injection
  STANDALONE: 2, // working standalone even if inside provider
  WAITING: 3, // waits for the original to be hoisted

  FORK: 4, // forking an existing one in the provider
  NOOP: 5, // a weird case that should not happen
  SOURCE: 6, // subscription via source property
  SOURCE_FORK: 8, // subscription via source property and fork

  OUTSIDE_PROVIDER: 7, // standalone outside provider
});

export function inferSubscriptionMode(contextValue, configuration) {
  // the subscription via source passes directly
  if (configuration[sourceConfigurationSecretSymbol] === true) {
    return configuration.fork ? AsyncStateSubscriptionMode.SOURCE_FORK : AsyncStateSubscriptionMode.SOURCE;
  }

  if (contextValue === null) {
    return AsyncStateSubscriptionMode.OUTSIDE_PROVIDER;
  }

  const {fork, hoistToProvider, promise} = configuration;
  const existsInProvider = !!contextValue.get(configuration.key);

  // early decide that this is a listener and return it immediately
  // because this is the most common use case that it will be, we'll be optimizing this path first
  if (existsInProvider && !hoistToProvider && !fork) {
    return AsyncStateSubscriptionMode.LISTEN;
  }

  if (!hoistToProvider && !fork && promise) { // we dont want to hoist or fork
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

export function promiseConfigFromConfiguration(configuration) {
  return {lazy: configuration.lazy, initialValue: configuration.initialValue};
}

export function inferAsyncStateInstance(mode, configuration, contextValue) {
  const candidate = contextValue?.get(configuration.key);
  switch (mode) {
    case AsyncStateSubscriptionMode.FORK:
      return contextValue.fork(configuration.key, configuration.forkConfig);
    case AsyncStateSubscriptionMode.HOIST:
      return contextValue.hoist(configuration);
    case AsyncStateSubscriptionMode.LISTEN:
      return candidate;
    case AsyncStateSubscriptionMode.WAITING:
      return waitingAsyncState;
    case AsyncStateSubscriptionMode.STANDALONE:
    case AsyncStateSubscriptionMode.OUTSIDE_PROVIDER:
      return new AsyncState(configuration.key, configuration.promise, promiseConfigFromConfiguration(configuration));
    case AsyncStateSubscriptionMode.NOOP:
      return null;
    case AsyncStateSubscriptionMode.SOURCE:
      return readAsyncStateFromSource(configuration.source);
    case AsyncStateSubscriptionMode.SOURCE_FORK: {
      const sourceAsyncState = readAsyncStateFromSource(configuration.source);
      return sourceAsyncState.fork(configuration.forkConfig);
    }
    default:
      return candidate;
  }
}

export const sourceConfigurationSecretSymbol = Symbol();

export const defaultUseASConfig = Object.freeze({
  source: undefined,

  fork: false,
  condition: true,
  hoistToProvider: false,
  forkConfig: EMPTY_OBJECT,
  hoistToProviderConfig: EMPTY_OBJECT,
  rerenderStatus: defaultRerenderStatusConfig,

  areEqual: shallowEqual,
  selector: oneObjectIdentity,
});

const waitingAsyncState = new AsyncState(
  "waiting_async_state",
  {}
);

export function calculateSelectedState(newState, lastSuccess, configuration) {
  const {selector} = configuration;
  return typeof selector === "function" ? selector(newState, lastSuccess) : newState;
}

export function applyUpdateOnReturnValue(returnValue, asyncState, stateValue, run, runAsyncState) {
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

export function shouldRecalculateInstance(configuration, mode, guard, deps, oldValue) {
  return !oldValue ||
    guard !== oldValue.guard ||
    mode !== oldValue.mode ||
    configuration.promise !== oldValue.configuration.promise ||
    configuration.source !== oldValue.configuration.source ||

    deps.some((dep, index) => !Object.is(dep, oldValue.deps[index])) ||

    configuration.fork !== oldValue.configuration.fork ||
    configuration.forkConfig?.keepState !== oldValue.configuration.forkConfig?.keepState ||

    configuration.hoistToProvider !== oldValue.configuration.hoistToProvider ||
    configuration.hoistToProviderConfig.override !== oldValue.configuration.hoistToProviderConfig.override;
}
