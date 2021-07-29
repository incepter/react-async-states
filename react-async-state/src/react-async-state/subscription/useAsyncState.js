import React from "react";
import { AsyncStateContext } from "../context";
import useProviderAsyncState from "./useProviderAsyncState";
import { useStandaloneAsyncState } from "./useStandaloneAsyncState";
import { defaultRerenderStatusConfig } from "./subscriptionUtils";
import { EMPTY_OBJECT, mergeObjects } from "../../utils";

export function useAsyncState(subscriptionConfig, dependencies) {
  const contextValue = React.useContext(AsyncStateContext);

  const configuration = React.useMemo(function readConfiguration() {
    return readConfig(subscriptionConfig);
  }, dependencies);

  // this will never change, because if suddenly you are no longer in this context
  // this means this component no longer exists (diffing algorithm will detect a type change and unmount)
  // so it is safe not be added as dependency to hooks ;) or even to violate the condition hook usage ;)
  const isInsideProvider = contextValue !== null; // null == context default value (React.createContext(null))

  if (isInsideProvider) {
    return useProviderAsyncState(configuration, dependencies);
  }
  return useStandaloneAsyncState(configuration, dependencies);
}

const defaultConfig = Object.freeze({
  fork: false,
  condition: true,
  hoistToProvider: false,
  forkConfig: EMPTY_OBJECT,
  hoistToProviderConfig: EMPTY_OBJECT,
  rerenderStatus: defaultRerenderStatusConfig,

  promiseConfig: {
    promise() {
      return undefined;
    },
    config: {lazy: false}
  },
});

// userConfig is the config the developer wrote
function readConfig(userConfig) {
  if (typeof userConfig === "function") {
    // if a function, re-attempt with string or object userConfig
    return readConfig(userConfig());
  }
  if (typeof userConfig === "string") {
    return mergeObjects(defaultConfig, {key: userConfig});
  }
  return mergeObjects(defaultConfig, userConfig);
}
