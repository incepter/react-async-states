import AsyncState from "async-state";
import {
  __DEV__,
  AsyncStateStatus,
  EMPTY_OBJECT,
  oneObjectIdentity,
  readAsyncStateConfigFromSubscriptionConfig,
  shallowClone,
  shallowEqual
} from "shared";
import { readAsyncStateFromSource } from "async-state/utils";
import { supportsConcurrentMode } from "../../helpers/supports-concurrent-mode";
import { enableComponentSuspension } from "shared/features";
import {AsyncStateSubscriptionMode} from "../../types";

export const defaultRerenderStatusConfig = Object.freeze({
  error: true,
  initial: true,
  success: true,
  aborted: true,
  pending: true,
});

export function inferSubscriptionMode(contextValue, configuration): AsyncStateSubscriptionMode {
  // the subscription via source passes directly
  if (configuration[sourceConfigurationSecretSymbol] === true) {
    return configuration.fork ? AsyncStateSubscriptionMode.SOURCE_FORK : AsyncStateSubscriptionMode.SOURCE;
  }

  if (contextValue === null) {
    return AsyncStateSubscriptionMode.OUTSIDE_PROVIDER;
  }

  const {key, fork, hoistToProvider, producer} = configuration;
  if (key === undefined && configuration.source?.key === undefined) {
    return AsyncStateSubscriptionMode.STANDALONE;
  }

  const existsInProvider = !!contextValue.get(key);

  // early decide that this is a listener and return it immediately
  // because this is the most common use case that it will be, we'll be optimizing this path first
  if (existsInProvider && !hoistToProvider && !fork) {
    return AsyncStateSubscriptionMode.LISTEN;
  }

  if (!hoistToProvider && !fork && producer) { // we dont want to hoist or fork
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

export function inferAsyncStateInstance(mode, configuration, contextValue) {
  const candidate = contextValue?.get(configuration.key);
  switch (mode) {
    case AsyncStateSubscriptionMode.FORK:
      return contextValue.fork(configuration.key, configuration.forkConfig);
    case AsyncStateSubscriptionMode.HOIST:
      return contextValue.hoist(configuration);
    case AsyncStateSubscriptionMode.LISTEN:
      return candidate;
    case AsyncStateSubscriptionMode.STANDALONE:
    case AsyncStateSubscriptionMode.OUTSIDE_PROVIDER:
      return new AsyncState(configuration.key, configuration.producer, readAsyncStateConfigFromSubscriptionConfig(configuration));
    case AsyncStateSubscriptionMode.SOURCE:
      return readAsyncStateFromSource(configuration.source);
    case AsyncStateSubscriptionMode.SOURCE_FORK: {
      const sourceAsyncState = readAsyncStateFromSource(configuration.source);
      return sourceAsyncState.fork(configuration.forkConfig);
    }
    case AsyncStateSubscriptionMode.NOOP:
    case AsyncStateSubscriptionMode.WAITING:
      return null;
    default:
      return candidate;
  }
}

export const sourceConfigurationSecretSymbol = Symbol();

// todo: remove falsy values
export const defaultUseASConfig = Object.freeze({
  source: undefined,

  lazy: true,
  fork: false,
  condition: true,
  hoistToProvider: false,
  forkConfig: EMPTY_OBJECT,
  hoistToProviderConfig: EMPTY_OBJECT,
  rerenderStatus: defaultRerenderStatusConfig,

  subscriptionKey: undefined,

  areEqual: shallowEqual,
  selector: oneObjectIdentity,
});

export function calculateSelectedState(newState, lastSuccess, configuration) {
  const {selector} = configuration;
  return typeof selector === "function" ? selector(newState, lastSuccess) : newState;
}

let didWarnAboutUnsupportedConcurrentFeatures = false;

export function applyUpdateOnReturnValue(returnValue, asyncState, stateValue, run, runAsyncState, mode) {
  returnValue.mode = mode;
  returnValue.source = asyncState._source;

  returnValue.state = stateValue;
  returnValue.payload = asyncState.payload; // todo: should this be exposed ? at least, shallow clone while shallow freezing
  returnValue.lastSuccess = asyncState.lastSuccess;

  returnValue.key = asyncState.key;

  returnValue.read = function readInConcurrentMode() {
    if (enableComponentSuspension) {
      if (supportsConcurrentMode()) {
        if (AsyncStateStatus.pending === asyncState?.currentState?.status && asyncState.suspender) {
          throw asyncState.suspender;
        }
      } else {
        if (__DEV__ && !didWarnAboutUnsupportedConcurrentFeatures) {
          console.error("[Warning] You are calling useAsyncState().read() without having react 18 or above " +
            "if the library throws, you will get an error in your app. You will be receiving the state value without " +
            "any suspension. Please consider upgrading to react 18 or above to use concurrent features.")
          didWarnAboutUnsupportedConcurrentFeatures = true;
        }
      }
    }
    return stateValue;
  }

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

export function shouldRecalculateInstance(newConfig, newMode, newGuard, currentDeps, oldSubscriptionInfo) {
  // here we check on relevant information to decide on the asyncState instance
  return !oldSubscriptionInfo ||
    newGuard !== oldSubscriptionInfo.guard ||
    newMode !== oldSubscriptionInfo.mode ||
    newConfig.producer !== oldSubscriptionInfo.configuration.producer ||
    newConfig.source !== oldSubscriptionInfo.configuration.source ||

    // attempt new instance if dependencies change
    currentDeps.some((dep, index) => !Object.is(dep, oldSubscriptionInfo.deps[index])) ||

    newConfig.fork !== oldSubscriptionInfo.configuration.fork ||
    newConfig.forkConfig?.keepState !== oldSubscriptionInfo.configuration.forkConfig?.keepState ||

    newConfig.hoistToProvider !== oldSubscriptionInfo.configuration.hoistToProvider ||
    newConfig.hoistToProviderConfig.override !== oldSubscriptionInfo.configuration.hoistToProviderConfig.override;
}
