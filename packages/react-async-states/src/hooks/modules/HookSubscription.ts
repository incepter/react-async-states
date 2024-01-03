import * as React from "react";
import {
  HookChangeEvents,
  HookChangeEventsFunction,
  HookSubscribeEvents,
  HookSubscription,
  PartialUseAsyncConfig,
  UseAsyncStateEventSubscribeFunction,
} from "../types";
import { createLegacyReturn } from "./HookReturnValue";
import { isFunction } from "../../shared";
import { StateInterface } from "async-states";
import {
  __DEV__getCurrentlyRenderingComponentName,
  endRenderPhaseRun,
  reconcileInstance,
  shouldRunSubscription,
  startRenderPhaseRun,
} from "./HookSubscriptionUtils";

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

type SubscriptionWithoutReturn<
  TData,
  TArgs extends unknown[],
  TError,
  S,
> = Omit<HookSubscription<TData, TArgs, TError, S>, "return" | "read">;

export function createSubscription<TData, TArgs extends unknown[], TError, S>(
  instance: StateInterface<TData, TArgs, TError>,
  update: React.Dispatch<React.SetStateAction<number>>,
  initialConfig: PartialUseAsyncConfig<TData, TArgs, TError, S>,
  deps: unknown[]
) {
  // these properties are to store the single onChange or onSubscribe
  // events (a single variable, but may be an array)
  // and every time you call onChange it overrides this value
  // sure, it receives the previous events as argument if function
  let changeEvents: HookChangeEvents<TData, TArgs, TError> | null = null;
  let subscribeEvents: HookSubscribeEvents<TData, TArgs, TError> | null = null;

  let incompleteSub: SubscriptionWithoutReturn<TData, TArgs, TError, S> = {
    deps,
    update,
    instance,
    cb: null,
    initial: true,
    config: initialConfig,
    version: instance.version,

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
    at: __DEV__getCurrentlyRenderingComponentName(),
  };

  let subscription = incompleteSub as HookSubscription<TData, TArgs, TError, S>;

  subscription.read = (readSubscriptionInConcurrentMode<
    TData,
    TArgs,
    TError,
    S
  >).bind(null, subscription);
  subscription.return = createLegacyReturn(subscription, initialConfig);
  return subscription;

  function onChange(
    newEvents:
      | HookChangeEventsFunction<TData, TArgs, TError>
      | HookChangeEvents<TData, TArgs, TError>
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
      | HookSubscribeEvents<TData, TArgs, TError>
  ) {
    if (isFunction(newEvents)) {
      let events = newEvents as UseAsyncStateEventSubscribeFunction<
        TData,
        TArgs,
        TError
      >;
      let maybeEvents = events(subscribeEvents);
      if (maybeEvents) {
        subscribeEvents = maybeEvents;
      }
    } else if (newEvents) {
      subscribeEvents = newEvents as HookSubscribeEvents<TData, TArgs, TError>;
    }
  }
}

let suspendingPromises: WeakSet<Promise<any>> = new WeakSet<Promise<any>>();
export function removePromiseFromSuspendersList(promise) {
  if (promise) {
    suspendingPromises.delete(promise);
  }
}
function readSubscriptionInConcurrentMode<
  TData,
  TArgs extends unknown[],
  TError,
  S,
>(
  subscription: HookSubscription<TData, TArgs, TError, S>,
  config: PartialUseAsyncConfig<TData, TArgs, TError, S>,
  suspend?: boolean,
  throwError?: boolean
) {
  let alternate = subscription.alternate;
  let newConfig = alternate?.config || config;
  // this means we want to suspend and the subscription is fresh (created in
  // render and hasn't been committed yet, or dependencies changed)
  if (suspend && (subscription.initial || subscription.config !== newConfig)) {
    // this means that's the initial subscription to this state instance
    // either in this path or when deps change, we will need to run again
    // if the condition is truthy
    // subscription.config !== newConfig means that deps changed
    let instance = subscription.instance;

    let promise = instance.promise;
    let update = subscription.update;
    let wasSuspending = !!promise && suspendingPromises.has(promise);
    let shouldRun = shouldRunSubscription(subscription, newConfig);

    if (shouldRun && !wasSuspending) {
      // The configuration may change the producer or an important option
      // So, it is important to reconcile before running.
      // In the normal flow, this reconciliation happens at the commit phase
      // but if we are to run during render, we should do it now.
      reconcileInstance(instance, newConfig);

      let runArgs = (newConfig.autoRunArgs || []) as TArgs;

      // we mark it as a render phase update so that subscriptions (already
      // mounted components) won't schedule a render right now, and thus
      // avoid scheduling a render on a component while rendering another
      let wasUpdatingOnRender = startRenderPhaseRun();
      instance.actions.run.apply(null, runArgs);
      endRenderPhaseRun(wasUpdatingOnRender);

      promise = instance.promise;

      // this means that the run was sync, in this case, we would need
      // to notify the previous subscribers to force an update
      // If the run was aborted from the producer (props.abort()), currentAbort
      // would be null, and in this case we are there was no run or updates
      // so we will notify only when currentAbort is not null and the promise
      // is falsy (resolved sync) (or probably read from cache)
      if (!promise && instance.currentAbort !== null) {
        notifyOtherInstanceSubscriptionsInMicrotask(subscription);
      }
    }

    if (promise && promise.status === "pending") {
      suspendingPromises.add(promise);
      throw promise;
    }
  }

  let currentReturn = alternate ? alternate.return : subscription.return;

  if (throwError && currentReturn.isError) {
    throw currentReturn.error;
  }

  return currentReturn.state;
}

function notifyOtherInstanceSubscriptionsInMicrotask<
  TData,
  TArgs extends unknown[],
  TError,
  S,
>(subscription: HookSubscription<TData, TArgs, TError, S>) {
  let { instance, cb } = subscription;
  let { subscriptions } = instance;

  let callbacks: Function[] = [];
  if (subscriptions) {
    for (let sub of Object.values(subscriptions)) {
      let subCallback = sub.props.cb;
      if (subCallback !== cb) {
        callbacks.push(subCallback);
      }
    }
  }

  if (callbacks.length) {
    queueMicrotask(() => {
      callbacks.forEach((callback) => callback(instance.state));
    });
  }
}
