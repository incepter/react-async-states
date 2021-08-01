import React from "react";
import { AsyncStateContext } from "../context";
import useRawAsyncState from "./useRawAsyncState";
import { EMPTY_OBJECT, invokeIfPresent } from "../../utils";
import { AsyncStateSubscriptionMode } from "./subscriptionUtils";
import { AsyncStateProviderSubscription } from "./AsyncStateProviderSubscription";

export default function useProviderAsyncState(configuration, dependencies) {
  const {key} = configuration;
  const [guard, setGuard] = React.useState(EMPTY_OBJECT); // used to trigger the recalculation of the memo
  const contextValue = React.useContext(AsyncStateContext);

  const dependenciesArray = [contextValue, guard, ...dependencies];

  const subscription = React.useMemo(function deduceSubscription() {
    return AsyncStateProviderSubscription(contextValue, configuration);
  }, dependenciesArray);

  // wait early
  React.useLayoutEffect(function waitForIfWaitingMode() {
    let waitingCleanup;
    if (AsyncStateSubscriptionMode.WAITING === subscription.mode) {
      waitingCleanup = contextValue.waitFor(key, function notify() {
        setGuard({});
      });
    }

    return function cleanup() {
      invokeIfPresent(waitingCleanup);
    };
  }, [subscription.asyncState]);

  return useRawAsyncState(
    subscription.asyncState,
    subscription.dependencies,
    subscription.configuration,
    subscription.run,
    subscription.dispose
  );
}
