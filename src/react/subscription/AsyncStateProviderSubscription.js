import {
  AsyncStateSubscriptionMode,
  deduceAsyncState,
  inferSubscriptionMode
} from "./subscriptionUtils";

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
