import AsyncState from "../../async-state/AsyncState";

export const defaultRerenderStatusConfig = Object.freeze({
  error: true,
  success: true,
  aborted: true,
  loading: true,
});

export const AsyncStateSubscriptionMode = Object.freeze({
  LISTEN: 0, // simple listener
  HOIST: 1, // hoisting a promise, for first time and intended to be shared, more like of an injection
  STANDALONE: 2, // working standalone even if inside provider
  WAITING: 3, // waits for the original to be hoisted

  FORK: 4, // forking an existing one in the provider
  NOOP: 5, // a weird case that should not happen
});

export function inferSubscriptionMode(contextValue, configuration) {
  const {fork, hoistToProvider} = configuration;
  const existsInProvider = !!contextValue.get(configuration.key);

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

export function deduceAsyncState(mode, configuration, contextValue) {
  const candidate = contextValue.get(configuration.key);
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
      return new AsyncState(configuration.key, configuration.promise, configuration.promiseConfig);
    case AsyncStateSubscriptionMode.NOOP:
      return null;
    default:
      return candidate;
  }
}

export function makeReturnValueFromAsyncState(asyncState, contextValue) {
  return Object.freeze({
    key: asyncState.key,

    run: asyncState.run.bind(asyncState),
    abort: asyncState.abort.bind(asyncState),
    replaceState: asyncState.replaceState.bind(asyncState),
    runAsyncState: contextValue ? contextValue.runAsyncState : undefined,

    state: Object.freeze({...asyncState.currentState}),
    previousState: asyncState.previousState ? Object.freeze({...asyncState.previousState}) : undefined,
  });
}
