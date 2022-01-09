import {defaultUseASConfig, sourceConfigurationSecretSymbol} from "./subscriptionUtils";
import {isAsyncStateSource} from "async-state/AsyncState";
import {
  ExtendedUseAsyncStateConfiguration,
  PartialUseAsyncStateConfiguration,
  UseAsyncStateConfiguration
} from "../../types";

// userConfig is the config the developer wrote
export function readUserConfiguration<T, E>(
  userConfig: ExtendedUseAsyncStateConfiguration<T, E>,
  overrides?: PartialUseAsyncStateConfiguration<T, E>
): UseAsyncStateConfiguration<T, E> {
  // this is direct anonymous producer configuration
  if (typeof userConfig === "function") {
    return Object.assign({}, defaultUseASConfig, overrides, {producer: userConfig});
  }
  // subscription to a state inside provider by key (or wait)
  // or a standalone outside provider with an undefined producer
  if (typeof userConfig === "string") {
    return Object.assign({}, defaultUseASConfig, overrides, {key: userConfig});
  }
  // subscription via source directly as configuration
  if (isAsyncStateSource(userConfig)) {
    return Object.assign(
      {},
      defaultUseASConfig,
      overrides,
      {source: userConfig, [sourceConfigurationSecretSymbol]: true});
  }
  // subscription via source using object configuration
  if (isAsyncStateSource((userConfig as UseAsyncStateConfiguration<T, E>)?.source)) {
    return Object.assign({}, defaultUseASConfig, userConfig, overrides, {
      [sourceConfigurationSecretSymbol]: true
    });
  }
  return Object.assign({}, defaultUseASConfig, overrides, userConfig);
}

const defaultAnonymousPrefix = "anonymous-async-state-";
export const nextKey: () => string = (function autoKey() {
  let key = 0;
  return function incrementAndGet() {
    key += 1;
    return `${defaultAnonymousPrefix}${key}`;
  }
}());
