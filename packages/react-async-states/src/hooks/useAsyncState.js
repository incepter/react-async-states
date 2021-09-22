import React from "react";
import { EMPTY_ARRAY, shallowClone } from "shared";
import { AsyncStateContext } from "../context";
import useProviderAsyncState from "./internal-hooks/useProviderAsyncState";
import { useStandaloneAsyncState } from "./internal-hooks/useStandaloneAsyncState";
import { defaultUseASConfig } from "./utils/subscriptionUtils";

/**
 * @typedef {Object} UseAsyncStateConfig
 * @property {string} key
 * @property {function} promise
 * @property {boolean} [fork=false]
 * @property {boolean} [condition=true]
 * @property {boolean} [hoistToProvider=false]
 *
 * @param {string | function | UseAsyncStateConfig} subscriptionConfig
 * @param dependencies
 * @returns {{ key, run, abort, runAsyncState, state: {status, data}}}
 */
export function useAsyncState(subscriptionConfig, dependencies = EMPTY_ARRAY) {
  const contextValue = React.useContext(AsyncStateContext);

  const configuration = React.useMemo(function readConfiguration() {
    return readRegularConfig(subscriptionConfig);
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

// userConfig is the config the developer wrote
function readRegularConfig(userConfig) {
  // this is an anonymous promise configuration (lazy: true, fork: false, hoist: false, payload: null)
  if (typeof userConfig === "function") {
    return readConfigFromPromiseFunction(userConfig);
  }
  if (typeof userConfig === "string") {
    return shallowClone(defaultUseASConfig, {key: userConfig});
  }
  return shallowClone(defaultUseASConfig, userConfig);
}


const defaultAnonymousPrefix = "anonymous-async-state-";
const nextKey = (function autoKey() {
  let key = 0;
  return function incrementAndGet() {
    key += 1;
    return `${defaultAnonymousPrefix}${key}`;
  }
}());

function readConfigFromPromiseFunction(promise) {
  return shallowClone(defaultUseASConfig, {promise, key: nextKey()});
}
