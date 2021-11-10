import { AsyncStateSubscriptionMode } from "./subscriptionUtils";

export function runAsyncStateSubscriptionFn(mode, asyncState, configuration, contextValue) {
  return function run(...args) {
    switch (mode) {
      case AsyncStateSubscriptionMode.SOURCE:
      case AsyncStateSubscriptionMode.SOURCE_FORK:
        return contextValue !== null ? contextValue.run(asyncState, ...args) : asyncState.run(...args);
      case AsyncStateSubscriptionMode.STANDALONE:
      case AsyncStateSubscriptionMode.OUTSIDE_PROVIDER:
        return asyncState.run(...args);
      case AsyncStateSubscriptionMode.FORK:
      case AsyncStateSubscriptionMode.HOIST:
      case AsyncStateSubscriptionMode.LISTEN:
        return contextValue.run(asyncState, ...args);
      // NoOp
      case AsyncStateSubscriptionMode.NOOP:
      case AsyncStateSubscriptionMode.WAITING:
      default:
        return undefined;
    }
  };
}

export function disposeAsyncStateSubscriptionFn(mode, asyncState, configuration, contextValue) {
  return function dispose() {
    switch (mode) {
      case AsyncStateSubscriptionMode.SOURCE:
      case AsyncStateSubscriptionMode.SOURCE_FORK: {
        return contextValue !== null ? contextValue.dispose(asyncState) : asyncState.dispose();
      }
      case AsyncStateSubscriptionMode.STANDALONE:
      case AsyncStateSubscriptionMode.OUTSIDE_PROVIDER:
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
  };
}
