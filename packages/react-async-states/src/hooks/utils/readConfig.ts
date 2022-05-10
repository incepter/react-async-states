import {
  defaultUseASConfig,
  sourceConfigurationSecretSymbol
} from "./subscriptionUtils";
import {
  UseAsyncStateConfig,
  PartialUseAsyncStateConfiguration,
  UseAsyncStateConfiguration
} from "../../types.internal";
import {isAsyncStateSource} from "../../async-state/AsyncState";
import {isFn} from "../../../../shared";

// userConfig is the config the developer wrote
export function readUserConfiguration<T, E>(
  userConfig: UseAsyncStateConfig<T, E>,
  overrides?: PartialUseAsyncStateConfiguration<T, E>
): UseAsyncStateConfiguration<T, E> {
  // this is direct anonymous producer configuration
  if (isFn(userConfig)) {
    return Object.assign(
      {},
      defaultUseASConfig,
      overrides,
      {producer: userConfig}
    );
  }
  // subscription to a state inside provider by key (or wait)
  // or a standalone outside provider with an undefined producer
  if (typeof userConfig === "string") {
    return Object.assign(
      {},
      defaultUseASConfig,
      overrides,
      {key: userConfig}
    );
  }
  // subscription via source directly as configuration
  if (isAsyncStateSource(userConfig)) {
    return Object.assign(
      {},
      defaultUseASConfig,
      overrides,
      {source: userConfig, [sourceConfigurationSecretSymbol]: true}
    );
  }
  // subscription via source using object configuration
  if (
    isAsyncStateSource((userConfig as UseAsyncStateConfiguration<T, E>)?.source)
  ) {
    return Object.assign(
      {},
      defaultUseASConfig,
      userConfig,
      overrides,
      {
        [sourceConfigurationSecretSymbol]: true
      }
    );
  }
  // @ts-ignore
  if (isFn(userConfig?.postSubscribe)) {
    console.error("[Deprecation warning] - postSubscribe was removed from the library." +
      " Please use events.subscribe instead.");
  }
  return Object.assign(
    {},
    defaultUseASConfig,
    overrides,
    userConfig
  );
}
