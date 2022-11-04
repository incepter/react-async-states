import {__DEV__} from "shared";
import {
  SubscriptionMode,
  UseAsyncStateConfiguration
} from "../../types.internal";
import {computeCallerName} from "./useCallerName";

let creationProperties, hoistProperties, forkProperties, irrelevantPropertiesByMode;

if (__DEV__) {
  creationProperties = [
    "producer",
    "runEffect",
    "cacheConfig",
    "initialValue",
    "skipPendingDelayMs",
    "runEffectDurationMs",
    "resetStateOnDispose",
  ];
  hoistProperties = [
    "hoistToProvider",
    "hoistToProviderConfig",
  ];
  forkProperties = [
    "fork",
    "forkConfig",
  ];
  irrelevantPropertiesByMode = {
    LISTEN: [...creationProperties, ...hoistProperties, ...forkProperties],
    HOIST: [...forkProperties],
    STANDALONE: [...hoistProperties, ...forkProperties],
    WAITING: [...creationProperties, ...hoistProperties, ...forkProperties],
    FORK: [...creationProperties, ...hoistProperties],
    NOOP: [],
    SOURCE: [...creationProperties, ...hoistProperties, ...forkProperties],
    SOURCE_FORK: [...creationProperties, ...hoistProperties],
    OUTSIDE_PROVIDER: [...hoistProperties, ...forkProperties],
  };
}



export function warnInDevAboutIrrelevantUseAsyncStateConfiguration(
  mode: SubscriptionMode,
  userConfig: UseAsyncStateConfiguration<any, any>
) {
  if (__DEV__) {
    const irrelevantProperties = irrelevantPropertiesByMode[mode];
    if (!irrelevantProperties.length) {
      return;
    }

    const usedIrrelevantProperties = irrelevantProperties.filter(
      prop => userConfig[prop] !== undefined
    )

    if (usedIrrelevantProperties.length) {
      const caller = computeCallerName(9);
      console.error(`[Incompatible configuration] - Subscription to '${userConfig.key}' ` +
        `${userConfig.subscriptionKey ? '(with subscriptionKey=' +
          userConfig.subscriptionKey + ') ' : ''}from '${caller}' is using incompatible ` +
        `['${usedIrrelevantProperties.join(", ")}'] properties with its mode '${mode}'`);
    }
  }
}
