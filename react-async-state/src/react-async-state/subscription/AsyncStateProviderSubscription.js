import AsyncState from "../../async-state/AsyncState";
import { AsyncStateSubscriptionMode, inferSubscriptionMode } from "./subscriptionUtils";

export function AsyncStateProviderSubscription(contextValue, configuration) {
  const mode = inferSubscriptionMode(contextValue, configuration);
  const asyncState = deduceAsyncState(mode, configuration, contextValue);

  return {
    mode,
    asyncState,
    run() {
      switch (mode) {
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
    },
    dispose() {
      switch (mode) {
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
    },
  };
}

function deduceAsyncState(mode, configuration, contextValue) {
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

function NoOp() {
}

const waitingAsyncState = new AsyncState(
  Symbol("waiting_async_state"),
  function promise() {
    return new Promise(NoOp);
  },
  {}
);
