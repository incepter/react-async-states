import { defaultUseASConfig, sourceConfigurationSecretSymbol } from "./subscriptionUtils";
import { isAsyncStateSource } from "async-state/AsyncState";

// userConfig is the config the developer wrote
export function readUserConfiguration(userConfig, overrides) {
  // this is an anonymous producer configuration (lazy: true, fork: false, hoist: false, payload: null)
  if (typeof userConfig === "function") {
    return readConfigFromProducerFunction(userConfig, overrides);
  }
  if (typeof userConfig === "string") {
    return Object.assign({}, defaultUseASConfig, overrides, {key: userConfig});
  }
  if (isAsyncStateSource(userConfig)) {
    return readSourceConfig(userConfig, overrides);
  }
  if (isAsyncStateSource(userConfig?.source)) {
    return readHybridSourceConfig(userConfig, overrides);
  }
  return Object.assign({}, defaultUseASConfig, overrides, userConfig);
}

function readSourceConfig(source, overrides) {
  return Object.assign({}, defaultUseASConfig, overrides, {source, [sourceConfigurationSecretSymbol]: true});
}

function readHybridSourceConfig(userConfig, overrides) {
  return Object.assign({}, defaultUseASConfig, userConfig, overrides, {
    source: userConfig.source,
    [sourceConfigurationSecretSymbol]: true
  });
}

const defaultAnonymousPrefix = "anonymous-async-state-";
export const nextKey = (function autoKey() {
  let key = 0;
  return function incrementAndGet() {
    key += 1;
    return `${defaultAnonymousPrefix}${key}`;
  }
}());

function readConfigFromProducerFunction(producer, overrides) {
  return Object.assign({}, defaultUseASConfig, overrides, {producer});
}
