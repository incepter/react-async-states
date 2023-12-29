import * as React from "react";
import {
  CleanupFn,
  HookChangeEvents,
  HookChangeEventsFunction,
  HookSubscription,
  PartialUseAsyncConfig,
  SubscribeEventProps,
  SubscriptionAlternate,
  UseAsyncChangeEventProps,
  UseAsyncStateEventFn,
  UseAsyncStateEventSubscribe,
  UseAsyncStateEventSubscribeFunction,
} from "../types";
import {
  createSubscriptionLegacyReturn,
  selectWholeState,
} from "./HookReturnValue";
import { __DEV__, isArray, isFunction } from "../../shared";
import { AbortFn, ProducerConfig, State, StateInterface } from "async-states";

export function useRetainInstance<TData, TArgs extends unknown[], TError, S>(
  instance: StateInterface<TData, TArgs, TError>,
  config: PartialUseAsyncConfig<TData, TArgs, TError, S>,
  deps: unknown[]
): HookSubscription<TData, TArgs, TError, S> {
  // ⚠️⚠️⚠️
  // the subscription will be constructed fully in the first time (per instance)
  // then we will update its properties through the alternate after rendering
  // so basically, we won't care about any dependency array except the instance
  // itself. Because all the other information will be held by the alternate.
  // so, sorry typescript and all readers 🙂
  let [, forceUpdate] = React.useState(0);
  return React.useMemo(
    () => createSubscription(instance, forceUpdate, config, deps),
    [instance]
  );
}

type SubscriptionWithoutReturn<TData, TArgs extends unknown[], TError, S> = Omit<
  HookSubscription<TData, TArgs, TError, S>,
  "return"
>;

function createSubscription<TData, TArgs extends unknown[], TError, S>(
  instance: StateInterface<TData, TArgs, TError>,
  update: React.Dispatch<React.SetStateAction<number>>,
  config: PartialUseAsyncConfig<TData, TArgs, TError, S>,
  deps: unknown[]
) {
  // these properties are to store the single onChange or onSubscribe
  // events (a single variable, but may be an array)
  // and every time you call onChange it overrides this value
  // sure, it receives the previous events as argument if function
  let changeEvents: HookChangeEvents<TData, TArgs, TError> | null = null;
  let subscribeEvents: UseAsyncStateEventSubscribe<TData, TArgs, TError> | null = null;

  let subscriptionWithoutReturn: SubscriptionWithoutReturn<TData, TArgs, TError, S> = {
    deps,
    config,
    update,
    instance,
    version: instance.version,

    read,
    onChange,
    onSubscribe,
    alternate: null,

    get changeEvents() {
      return changeEvents;
    },
    get subscribeEvents() {
      return subscribeEvents;
    },

    // used in dev mode
    at: currentlyRenderingComponentName,
  };

  let subscription = subscriptionWithoutReturn as HookSubscription<TData, TArgs, TError, S>;
  subscription.return = createSubscriptionLegacyReturn(subscription, config);

  return subscription;

  function read(suspend?: boolean, throwError?: boolean): S {
    let alternate = subscription.alternate;
    let currentReturn = alternate ? alternate.return : subscription.return;

    if (!config.concurrent) {
      config.concurrent = true;
    }

    if (suspend) {
      let currentStatus = instance.state.status;
      if (currentStatus === "initial") {
        let shouldRun = shouldRunSubscription(instance, config);
        if (shouldRun) {
          // The configuration may change the producer or an important option
          // So, it is important to reconcile before running.
          // In the normal flow, this reconciliation happens at the commit phase
          // but if we are to run during render, we should do it now.
          reconcileInstance(instance, config);

          let runArgs = (config.autoRunArgs || []) as TArgs;
          // run is used than runp because it may be synchronous, so the run
          // would resolve immediately.
          // This is dangerous since it may do some side effects, but the user
          // should be careful with that. Anyways, runp will run the producer
          // too, so the side effects are applied either ways
          // If the run results in a pending state, it will throw next
          throw instance.actions.runp.apply(null, runArgs);
        }
      }
      if (currentStatus === "pending") {
        throw instance.promise!;
      }
    }
    if (throwError && currentReturn.isError) {
      throw currentReturn.error;
    }

    return currentReturn.state;
  }

  function onChange(
    newEvents: HookChangeEventsFunction<TData, TArgs, TError> | HookChangeEvents<TData, TArgs, TError>
  ) {
    if (isFunction(newEvents)) {
      let events = newEvents as HookChangeEventsFunction<TData, TArgs, TError>;
      let maybeEvents = events(changeEvents);
      if (maybeEvents) {
        changeEvents = maybeEvents;
      }
    } else if (newEvents) {
      changeEvents = newEvents as HookChangeEvents<TData, TArgs, TError>;
    }
  }

  function onSubscribe(
    newEvents:
      | UseAsyncStateEventSubscribeFunction<TData, TArgs, TError>
      | UseAsyncStateEventSubscribe<TData, TArgs, TError>
  ) {
    if (isFunction(newEvents)) {
      let events = newEvents as UseAsyncStateEventSubscribeFunction<TData, TArgs, TError>;
      let maybeEvents = events(subscribeEvents);
      if (maybeEvents) {
        subscribeEvents = maybeEvents;
      }
    } else if (newEvents) {
      subscribeEvents = newEvents as UseAsyncStateEventSubscribe<TData, TArgs, TError>;
    }
  }
}

export function beginRenderSubscription<TData, TArgs extends unknown[], TError, S>(
  subscription: HookSubscription<TData, TArgs, TError, S>,
  newConfig: PartialUseAsyncConfig<TData, TArgs, TError, S>,
  deps: unknown[]
): SubscriptionAlternate<TData, TArgs, TError, S> | null {
  let instance = subscription.instance;

  if (newConfig === subscription.config) {
    // this means that the dependencies did not change and the same config
    // remains from the previous render (or this is the first render).
    // At this point, there is no need to create the alternate.
    // which will be equivalent to a render bailout. But we'll need to check
    // on the versions in case something bad happened.
    if (subscription.version === instance.version) {
      // null to bail out the render
      completeRenderSubscription(subscription);
      return null;
    }
  }

  let alternate = {
    deps,
    instance,
    config: newConfig,
    return: subscription.return,
    update: subscription.update,
    version: subscription.version,
  };
  subscription.alternate = alternate;
  // at this point, we have a defined alternate. Let's perform a render

  // first thing to do, is to verify the optimistic lock
  if (alternate.version !== instance.version) {
    // this means that the instance received an update in between, so we need
    // to change the returned value
    alternate.version = instance.version;
    alternate.return = createSubscriptionLegacyReturn(subscription, newConfig);
    // no need to check anything else since this is a fresh value

    completeRenderSubscription(subscription);
    return alternate;
  }

  // next, we will check the selector function
  let pendingSelector = newConfig.selector || selectWholeState;

  if (pendingSelector !== subscription.config.selector) {
    let { cache, state, lastSuccess } = instance;
    let comparingFunction = newConfig.areEqual || Object.is;

    let newSelectedValue = pendingSelector(state, lastSuccess, cache);

    // this means that the selected value did change
    if (!comparingFunction(subscription.return.state, newSelectedValue)) {
      // todo: this will recalculate the selected state, make it not
      alternate.return = createSubscriptionLegacyReturn(
        subscription,
        newConfig
      );
    }
  }

  completeRenderSubscription(subscription);
  return alternate;
}

export function completeRenderSubscription<TData, TArgs extends unknown[], TError, S>(
  subscription: HookSubscription<TData, TArgs, TError, S>
): void {
  if (__DEV__) {
    __DEV__unsetHookCallerName();
  }
  let { config, alternate } = subscription;
  let usedReturn = (alternate || subscription).return;

  if (config.concurrent) {
    // Reading via "read" may result in running the instance's producer.
    // So, it is important to reconcile before running.
    // Reconciliation is done inside the "read" function and only
    // when we should run.
    usedReturn.read(true, false);
  }
}

export function commit<TData, TArgs extends unknown[], TError, S>(
  subscription: HookSubscription<TData, TArgs, TError, S>,
  pendingAlternate: SubscriptionAlternate<TData, TArgs, TError, S> | null
) {
  // here, we commit the alternate
  Object.assign(subscription, pendingAlternate);
  if (subscription.alternate === pendingAlternate) {
    subscription.alternate = null;
  }

  // on commit, the first thing to do is to detect whether a state change
  // occurred before commit
  let version = subscription.version;
  let currentInstance = subscription.instance;

  if (version !== currentInstance.version) {
    subscription.update(forceComponentUpdate);
    return;
  }

  reconcileInstance(currentInstance, subscription.config);
}

function reconcileInstance<TData, TArgs extends unknown[], TError, S>(
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

function removeHookConfigToPatchToSource<TData, TArgs extends unknown[], TError, S>(
  currentConfig: PartialUseAsyncConfig<TData, TArgs, TError, S>
): ProducerConfig<TData, TArgs, TError> {
  // the patched config may contain the following properties
  // - source
  // - payload
  // - events
  // and other properties that can be retrieved from hooks usage and others
  // so we are tearing them apart before merging
  let output = { ...currentConfig };

  delete output.lazy;
  delete output.events;
  delete output.source;
  delete output.payload;
  delete output.concurrent;
  delete output.autoRunArgs;
  delete output.subscriptionKey;

  return output;
}

// this will detect whether the returned value from the hook doesn't match
// the new state's status.
function doesStateMismatchSubscriptionReturn(
  newState: State<any, any, any>,
  subscriptionReturn: HookSubscription<any, any, any, any>["return"]
) {
  switch (newState.status) {
    case "initial": {
      return !subscriptionReturn.isInitial;
    }
    case "pending": {
      return !subscriptionReturn.isPending;
    }
    case "success": {
      return !subscriptionReturn.isSuccess;
    }
    case "error": {
      return !subscriptionReturn.isError;
    }
    default: {
      return false;
    }
  }
}

function resolveSubscriptionKey<TData, TArgs extends unknown[], TError, S>(
  subscription: HookSubscription<TData, TArgs, TError, S>
) {
  let key = subscription.config.subscriptionKey || subscription.at || undefined;

  return `${key}-${(subscription.instance.subsIndex || 0) + 1}`;
}

export function autoRunAndSubscribeEvents<TData, TArgs extends unknown[], TError, S>(
  subscription: HookSubscription<TData, TArgs, TError, S>
) {
  let currentConfig = subscription.config;
  let currentInstance = subscription.instance;
  let instanceActions = currentInstance.actions;

  // we capture this state here to test it against updates in a fast way
  let committedState = currentInstance.state;
  // perform the subscription to the instance here
  let onStateChangeCallback = onStateChange<TData, TArgs, TError, S>;

  // when the subscription key is provided, take it.
  // otherwise, in dev take the component name
  let subscriptionKey =
    subscription.config.subscriptionKey ?? __DEV__
      ? resolveSubscriptionKey(subscription)
      : undefined;

  let unsubscribeFromInstance = instanceActions.subscribe({
    key: subscriptionKey,
    cb: onStateChangeCallback.bind(null, subscription, committedState),
  });

  let cleanups: ((() => void) | undefined)[] = [unsubscribeFromInstance];

  let subscribeEvents = currentConfig.events?.subscribe;
  if (subscribeEvents) {
    let unsubscribeFromEvents = invokeSubscribeEvents(
      currentInstance,
      subscribeEvents
    );
    if (unsubscribeFromEvents) {
      cleanups = cleanups.concat(unsubscribeFromEvents);
    }
  }

  let subscriptionSubscribeEvents = subscription.subscribeEvents;
  if (subscriptionSubscribeEvents) {
    let unsubscribeFromEvents = invokeSubscribeEvents(
      currentInstance,
      subscriptionSubscribeEvents
    );
    if (unsubscribeFromEvents) {
      cleanups = cleanups.concat(unsubscribeFromEvents);
    }
  }

  // now, we will run the subscription. In order to run, all these conditions
  // should be met:
  // 1. lazy = false in the configuration
  // 2. condition() is true
  // 3. dependencies did change
  // 4. concurrent isn't enabled (it will run on render)
  if (
    !currentConfig.concurrent &&
    shouldRunSubscription(currentInstance, currentConfig)
  ) {
    let autoRunArgs = (currentConfig.autoRunArgs || []) as TArgs;
    let thisRunAbort: AbortFn = currentInstance.actions.run.apply(
      null,
      autoRunArgs
    );

    // add this run abort to the cleanups to it is aborted automatically
    cleanups.push(thisRunAbort);
  }

  return function cleanup() {
    for (let fn of cleanups) {
      if (fn) {
        fn();
      }
    }
  };
}

function onStateChange<TData, TArgs extends unknown[], TError, S>(
  subscription: HookSubscription<TData, TArgs, TError, S>,
  committedState: State<TData, TArgs, TError>,
  newState: State<TData, TArgs, TError>
) {
  let currentReturn = subscription.return;
  let currentConfig = subscription.config;
  let currentInstance = subscription.instance;

  // the very first thing to do, is to invoke change events if relevant
  let changeEvents = currentConfig.events?.change;
  if (changeEvents) {
    invokeChangeEvents(currentInstance, changeEvents);
  }
  let subscriptionChangeEvents = subscription.changeEvents;
  if (subscriptionChangeEvents) {
    invokeChangeEvents(currentInstance, subscriptionChangeEvents);
  }

  let actualVersion = currentInstance.version;

  // when we detect that this state is mismatching what was rendered
  // then we need to force the render and computation
  if (doesStateMismatchSubscriptionReturn(newState, currentReturn)) {
    subscription.update(forceComponentUpdate);
    return;
  }

  // this will happen if we consume the latest cached state
  if (committedState === newState) {
    return;
  }

  // at this point, we have a new state, so we need to perform checks
  let comparingFunction = currentConfig.areEqual || Object.is;
  let currentSelector = currentConfig.selector || selectWholeState;

  let { cache, lastSuccess } = currentInstance;
  let newSelectedValue = currentSelector(newState, lastSuccess, cache);

  if (!comparingFunction(currentReturn.state, newSelectedValue)) {
    subscription.update(forceComponentUpdate);
  } else {
    // we would keep the same previous state, but we will upgrade all
    // closure variables used in this callback
    subscription.version = actualVersion;
  }
}

function shouldRunSubscription<TData, TArgs extends unknown[], TError, S>(
  instance: StateInterface<TData, TArgs, TError>,
  config: PartialUseAsyncConfig<TData, TArgs, TError, S>
) {
  if (config.lazy === false) {
    let condition = config.condition;
    if (condition === undefined || condition === true) {
      return true;
    } else if (isFunction(condition)) {
      let autoRunArgs = (config.autoRunArgs || []) as TArgs;
      return condition(
        instance.state,
        autoRunArgs,
        instance.actions.getPayload()
      );
    }
  }

  return false;
}

export function forceComponentUpdate(prev: number) {
  return prev + 1;
}

export function invokeChangeEvents<TData, TArgs extends unknown[], TError>(
  instance: StateInterface<TData, TArgs, TError>,
  events: UseAsyncStateEventFn<TData, TArgs, TError> | UseAsyncStateEventFn<TData, TArgs, TError>[]
) {
  let nextState = instance.state;
  const changeHandlers: UseAsyncStateEventFn<TData, TArgs, TError>[] = isArray(events)
    ? events
    : [events];

  const eventProps = {
    state: nextState,
    source: instance.actions,
  } as UseAsyncChangeEventProps<TData, TArgs, TError>;

  changeHandlers.forEach((event) => {
    if (typeof event === "object") {
      const { handler, status } = event;
      if (!status || nextState.status === status) {
        // @ts-expect-error: it is extremely difficult to satisfy typescript
        // here without a switch case and treat each status a part
        handler(eventProps);
      }
    } else {
      // @ts-expect-error: it is extremely difficult to satisfy typescript
      // here without a switch case and treat each status a part
      event(eventProps);
    }
  });
}

export function invokeSubscribeEvents<TData, TArgs extends unknown[], TError>(
  instance: StateInterface<TData, TArgs, TError>,
  events: UseAsyncStateEventSubscribe<TData, TArgs, TError> | undefined
): CleanupFn[] | null {
  if (!events || !instance) {
    return null;
  }

  let eventProps: SubscribeEventProps<TData, TArgs, TError> = instance.actions;

  let handlers: ((props: SubscribeEventProps<TData, TArgs, TError>) => CleanupFn)[] =
    isArray(events) ? events : [events];

  return handlers.map((handler) => handler(eventProps));
}

// dev mode helpers
let currentlyRenderingComponentName: string | null = null;
export function __DEV__setHookCallerName(name: string | undefined) {
  if (name && !currentlyRenderingComponentName) {
    currentlyRenderingComponentName = name;
  }
}

export function __DEV__unsetHookCallerName() {
  currentlyRenderingComponentName = null;
}
