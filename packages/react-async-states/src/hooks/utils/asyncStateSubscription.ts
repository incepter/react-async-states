import {
  AsyncStateContextValue,
  AsyncStateSubscriptionMode,
  UseAsyncStateConfiguration,
  UseAsyncStateContextType
} from "../../types.internal";
import {AbortFn, AsyncStateInterface} from "../../async-state";
import {standaloneRunExtraPropsCreator} from "../../helpers/run-props-creator";

export function runAsyncStateSubscriptionFn<T, E>(
  mode: AsyncStateSubscriptionMode,
  asyncState: AsyncStateInterface<T>,
  contextValue: UseAsyncStateContextType
): (...args: any[]) => AbortFn {
  return function run(...args) {
    switch (mode) {
      case AsyncStateSubscriptionMode.SOURCE:
      case AsyncStateSubscriptionMode.STANDALONE:
      case AsyncStateSubscriptionMode.SOURCE_FORK:
        return contextValue !== null ?
          contextValue.run(
            asyncState,
            ...args
          )
          :
          asyncState.run(standaloneRunExtraPropsCreator, ...args);
      case AsyncStateSubscriptionMode.OUTSIDE_PROVIDER:
        return asyncState.run(standaloneRunExtraPropsCreator, ...args);
      case AsyncStateSubscriptionMode.FORK:
      case AsyncStateSubscriptionMode.HOIST:
      case AsyncStateSubscriptionMode.LISTEN: {
        return (contextValue as AsyncStateContextValue).run(
          asyncState,
          ...args
        );
      }
      // NoOp - should not happen
      case AsyncStateSubscriptionMode.NOOP:
      case AsyncStateSubscriptionMode.WAITING:
      default:
        return undefined;
    }
  };
}

export function disposeAsyncStateSubscriptionFn<T, E>(
  mode: AsyncStateSubscriptionMode,
  asyncState: AsyncStateInterface<T>,
  contextValue: UseAsyncStateContextType
): () => (boolean | undefined) {
  return function dispose() {
    switch (mode) {
      case AsyncStateSubscriptionMode.HOIST:
        return (contextValue as AsyncStateContextValue).dispose(asyncState);
      // NoOp - should not happen
      case AsyncStateSubscriptionMode.SOURCE:
      case AsyncStateSubscriptionMode.SOURCE_FORK:
      case AsyncStateSubscriptionMode.LISTEN:
      case AsyncStateSubscriptionMode.FORK:
      case AsyncStateSubscriptionMode.STANDALONE:
      case AsyncStateSubscriptionMode.OUTSIDE_PROVIDER:
      case AsyncStateSubscriptionMode.NOOP:
      case AsyncStateSubscriptionMode.WAITING:
      default:
        return undefined;
    }
  };
}
