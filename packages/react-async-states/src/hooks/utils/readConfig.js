import { shallowClone } from "shared";
import { defaultUseASConfig, sourceSecretSymbol } from "./subscriptionUtils";
import { isAsyncStateSource } from "async-state/AsyncState";

// userConfig is the config the developer wrote
export function readUserConfiguration(userConfig) {
  // this is an anonymous promise configuration (lazy: true, fork: false, hoist: false, payload: null)
  if (typeof userConfig === "function") {
    return readConfigFromPromiseFunction(userConfig);
  }
  if (typeof userConfig === "string") {
    return shallowClone(defaultUseASConfig, {key: userConfig});
  }
  if (isAsyncStateSource(userConfig)) {
    return readSourceConfig(userConfig);
  }
  if (isAsyncStateSource(userConfig.source)) {
    return readHybridSourceConfig(userConfig);
  }
  return shallowClone(defaultUseASConfig, userConfig);
}

function readSourceConfig(source) {
  return shallowClone(defaultUseASConfig, {source, [sourceSecretSymbol]: true});
}

function readHybridSourceConfig(userConfig) {
  return Object.assign({}, defaultUseASConfig, userConfig, {
    source: userConfig.source,
    [sourceSecretSymbol]: true
  });
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
