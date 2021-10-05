import {
  AsyncStateSubscriptionMode,
  deduceAsyncState,
  inferSubscriptionMode
} from "./subscriptionUtils";
import { shallowClone } from "shared";

export function AsyncStateProviderSubscription(contextValue, configuration) {
  const mode = inferSubscriptionMode(contextValue, configuration);
  const asyncState = deduceAsyncState(mode, configuration, contextValue);

  return {
    mode,
    asyncState,
    run(...args) {
      switch (mode) {
        case AsyncStateSubscriptionMode.SOURCE:
        case AsyncStateSubscriptionMode.STANDALONE: {
          if (configuration.payload) {
            asyncState.payload = shallowClone(asyncState.payload, configuration.payload);
          }
          return asyncState.run(...args);
        }
        case AsyncStateSubscriptionMode.FORK:
        case AsyncStateSubscriptionMode.HOIST:
        case AsyncStateSubscriptionMode.LISTEN: {
          if (configuration.payload) {
            asyncState.payload = shallowClone(asyncState.payload, configuration.payload);
          }
          return contextValue.run(asyncState, ...args);
        }
        // NoOp
        case AsyncStateSubscriptionMode.NOOP:
        case AsyncStateSubscriptionMode.WAITING:
        default:
          return undefined;
      }
    },
    dispose() {
      switch (mode) {
        case AsyncStateSubscriptionMode.SOURCE:
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
