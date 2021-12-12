import { defaultUseASConfig, sourceConfigurationSecretSymbol } from "./subscriptionUtils";
import { isAsyncStateSource } from "async-state/AsyncState";

// userConfig is the config the developer wrote
export function readUserConfiguration(userConfig, overrides) {
  // this is an anonymous producer configuration (lazy: true, fork: false, hoist: false, payload: null)
  if (typeof userConfig === "function") {
    return Object.assign({}, defaultUseASConfig, overrides, {producer: userConfig});
  }
  if (typeof userConfig === "string") {
    return Object.assign({}, defaultUseASConfig, overrides, {key: userConfig});
  }
  if (isAsyncStateSource(userConfig)) {
    return Object.assign(
      {},
      defaultUseASConfig,
      overrides,
      {source: userConfig, [sourceConfigurationSecretSymbol]: true});
  }
  if (isAsyncStateSource(userConfig?.source)) {
    return Object.assign({}, defaultUseASConfig, userConfig, overrides, {
      source: userConfig.source,
      [sourceConfigurationSecretSymbol]: true
    });
  }
  return Object.assign({}, defaultUseASConfig, overrides, userConfig);
}

const defaultAnonymousPrefix = "anonymous-async-state-";
export const nextKey = (function autoKey() {
  let key = 0;
  return function incrementAndGet() {
    key += 1;
    return `${defaultAnonymousPrefix}${key}`;
  }
}());
