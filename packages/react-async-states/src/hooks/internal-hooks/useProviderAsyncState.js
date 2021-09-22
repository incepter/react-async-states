import React from "react";
import { EMPTY_OBJECT } from "shared";
import { AsyncStateContext } from "../../context";
import useRawAsyncState from "./useRawAsyncState";
import { AsyncStateProviderSubscription } from "../utils/AsyncStateProviderSubscription";
import { AsyncStateSubscriptionMode } from "../utils/subscriptionUtils";

export default function useProviderAsyncState(configuration, dependencies) {
  const {key} = configuration;
  const [guard, setGuard] = React.useState(EMPTY_OBJECT); // used to trigger the recalculation of the memo
  const contextValue = React.useContext(AsyncStateContext);

  const dependenciesArray = [contextValue, guard, ...dependencies];

  const subscription = React.useMemo(function deduceSubscription() {
    return AsyncStateProviderSubscription(contextValue, configuration);
  }, dependenciesArray);

  // React.useLayoutEffect(() => {
  //   return () => console.log('i am unmounting', configuration.key)
  // }, [])
  // wait early
  // this sets  a watcher to observe present async state
  React.useLayoutEffect(function watchAsyncState() {
    switch (subscription.mode) {
      case AsyncStateSubscriptionMode.FORK:
      case AsyncStateSubscriptionMode.HOIST:
      case AsyncStateSubscriptionMode.WAITING:
      case AsyncStateSubscriptionMode.LISTEN: {
        let watchedKey = AsyncStateSubscriptionMode.WAITING === subscription.mode ? key : subscription.asyncState?.key;
        return contextValue.watch(watchedKey, function notify(newValue) {
          if (newValue !== subscription.asyncState) {
            setGuard({});
          }
        });
      }
      case AsyncStateSubscriptionMode.NOOP:
      case AsyncStateSubscriptionMode.STANDALONE:
      default: return undefined;
    }
  }, [subscription]);

  return useRawAsyncState(
    subscription.asyncState,
    dependencies,
    configuration,
    subscription.run,
    subscription.dispose,
    contextValue.runAsyncState
  );
}
