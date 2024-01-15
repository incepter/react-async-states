import { HookSubscription, PartialUseAsyncConfig } from "../types";
import { __DEV__, emptyArray, isFunction } from "../../shared";
import { ProducerConfig, State, StateInterface } from "async-states";

let isCurrentlyRunningOnRender = false;
export function startRenderPhaseRun() {
  let prev = isCurrentlyRunningOnRender;
  isCurrentlyRunningOnRender = true;
  return prev;
}
export function endRenderPhaseRun(nextValue: boolean) {
  isCurrentlyRunningOnRender = nextValue;
}

export function isRenderPhaseRun() {
  return isCurrentlyRunningOnRender;
}

export function shouldRunSubscription<
  TData,
  TArgs extends unknown[],
  TError,
  S,
>(
  subscription: HookSubscription<TData, TArgs, TError, S>,
  subscriptionConfig: PartialUseAsyncConfig<TData, TArgs, TError, S>
) {
  let { instance, alternate } = subscription;
  let config = alternate?.config || subscriptionConfig;
  let { lazy, condition, autoRunArgs } = config;
  return shouldSubscriptionRun(
    instance.state,
    instance.actions.getPayload(),
    lazy,
    condition,
    (autoRunArgs || emptyArray) as TArgs
  );
}

export function shouldSubscriptionRun<
  TData,
  TArgs extends unknown[],
  TError,
  S,
>(
  state: State<TData, TArgs, TError>,
  payload: Record<string, unknown>,
  lazy: PartialUseAsyncConfig<TData, TArgs, TError, S>["lazy"],
  condition: PartialUseAsyncConfig<TData, TArgs, TError, S>["condition"],
  args: TArgs
) {
  if (lazy === false) {
    if (condition === undefined || condition === true) {
      return true;
    } else if (isFunction(condition)) {
      return condition(state, args, payload);
    }
  }

  return false;
}

export function reconcileInstance<TData, TArgs extends unknown[], TError, S>(
  instance: StateInterface<TData, TArgs, TError>,
  currentConfig: PartialUseAsyncConfig<TData, TArgs, TError, S>
) {
  let instanceActions = instance.actions;

  // 📝 We can call this part the instance reconciliation
  // patch the given config and the new producer if provided and different
  // we might be able to iterate over properties and re-assign only the ones
  // that changed and are supported.
  let configToPatch = removeHookConfigToPatchToSource(currentConfig);
  instanceActions.patchConfig(configToPatch);
  if (currentConfig.payload) {
    instanceActions.mergePayload(currentConfig.payload);
  }

  let currentProducer = instance.fn;
  let pendingProducer = currentConfig.producer;
  if (pendingProducer !== undefined && pendingProducer !== currentProducer) {
    instanceActions.replaceProducer(pendingProducer);
  }
}

function removeHookConfigToPatchToSource<
  TData,
  TArgs extends unknown[],
  TError,
  S,
>(
  currentConfig: PartialUseAsyncConfig<TData, TArgs, TError, S>
): ProducerConfig<TData, TArgs, TError> {
  // the patched config may contain the following properties
  // - source
  // - payload
  // - events
  // and other properties that can be retrieved from hooks usage and others
  // so we are tearing them apart before merging
  let {
    lazy,
    events,
    source,
    payload,
    concurrent,
    autoRunArgs,
    subscriptionKey,
    ...output
  } = currentConfig;

  return output;
}

export function forceComponentUpdate(prev: number) {
  return prev + 1;
}

// dev mode helpers
let currentlyRenderingComponentName: string | null = null;
export function __DEV__setHookCallerName(name: string | undefined) {
  if (name && !currentlyRenderingComponentName) {
    currentlyRenderingComponentName = name;
  }
}

export function __DEV__getCurrentlyRenderingComponentName() {
  return currentlyRenderingComponentName;
}

export function __DEV__unsetHookCallerName() {
  currentlyRenderingComponentName = null;
}

let __DEV__betterSourceConfigProperties: Partial<
  Record<keyof PartialUseAsyncConfig<any, any, any, any>, true>
>;
if (__DEV__) {
  __DEV__betterSourceConfigProperties = {
    runEffect: true,
    retryConfig: true,
    cacheConfig: true,
    initialValue: true,
    hideFromDevtools: true,
    skipPendingStatus: true,
    skipPendingDelayMs: true,
    resetStateOnDispose: true,
    runEffectDurationMs: true,
  };
}

export function __DEV__warnInDevAboutIncompatibleConfig(
  subscription: HookSubscription<any, any, any, any>
) {
  let { config } = subscription;
  let { source, key, producer } = config;
  if (source) {
    if (key) {
      console.error(
        `[Warning][async-states] Subscription in component ${subscription.at} ` +
          `has a 'source' and 'key' as the same time, 'key' has no effect.`
      );
      return;
    }
    if (producer) {
      console.error(
        `[Warning][async-states] Subscription in component ${subscription.at} ` +
          `has a 'source' (${source.key}) and 'producer' as the same time,` +
          ` the source's producer will be replaced.`
      );
      return;
    }

    let configuredProps = Object.keys(config).filter(
      (t) => config[t] !== undefined && __DEV__betterSourceConfigProperties[t]
    );
    if (configuredProps.length) {
      console.error(
        `[Warning][async-states] Subscription in component ${subscription.at} ` +
          `has a 'source' and the following properties '` +
          configuredProps.join(", ") +
          "' at the same time. All these props will be flushed into the " +
          "source config, better move them to the source creation."
      );
      return;
    }
  }
}
