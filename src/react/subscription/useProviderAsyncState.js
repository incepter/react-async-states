import React from "react";
import { AsyncStateContext } from "../context";
import useRawAsyncState from "./useRawAsyncState";
import { EMPTY_OBJECT } from "../../shared";
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
  // this sets  a watcher to observe present async state
  React.useLayoutEffect(function watchAsyncState() {
    let watchedKey = subscription.asyncState?.key || key;

    return contextValue.watch(watchedKey, function notify() {
      setGuard({});
    });
  }, [subscription.asyncState]);

  return useRawAsyncState(
    subscription.asyncState,
    dependencies,
    configuration,
    subscription.run,
    subscription.dispose
  );
}
