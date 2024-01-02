import {
  CleanupFn,
  HookSubscription,
  SubscribeEventProps,
  SubscriptionAlternate,
  UseAsyncChangeEventProps,
  UseAsyncStateEventFn,
  UseAsyncStateEventSubscribe,
} from "../types";
import { __DEV__, isArray } from "../../shared";
import { selectWholeState } from "./HookReturnValue";
import { AbortFn, State, StateInterface } from "async-states";
import {
  forceComponentUpdate,
  reconcileInstance,
  shouldRunSubscription,
} from "./HookSubscriptionUtils";
import { removePromiseFromSuspendersList } from "./HookSubscription";

function resolveSubscriptionKey<TData, TArgs extends unknown[], TError, S>(
  subscription: HookSubscription<TData, TArgs, TError, S>
) {
  let key = subscription.config.subscriptionKey || subscription.at || undefined;

  return `${key}-${(subscription.instance.subsIndex || 0) + 1}`;
}

export function commit<TData, TArgs extends unknown[], TError, S>(
  subscription: HookSubscription<TData, TArgs, TError, S>,
  pendingAlternate: SubscriptionAlternate<TData, TArgs, TError, S> | null
) {
  // here, we commit the alternate
  Object.assign(subscription, pendingAlternate);
  subscription.initial = false;
  if (subscription.alternate === pendingAlternate) {
    subscription.alternate = null;
  }

  // on commit, the first thing to do is to detect whether a state change
  // occurred before commit
  let version = subscription.version;
  let currentInstance = subscription.instance;
  removePromiseFromSuspendersList(currentInstance.promise);

  reconcileInstance(currentInstance, subscription.config);

  if (version !== currentInstance.version) {
    subscription.update(forceComponentUpdate);
    return;
  }
}

export function autoRunAndSubscribeEvents<
  TData,
  TArgs extends unknown[],
  TError,
  S,
>(subscription: HookSubscription<TData, TArgs, TError, S>) {
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
    shouldRunSubscription(subscription, currentConfig)
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

export function invokeChangeEvents<TData, TArgs extends unknown[], TError>(
  instance: StateInterface<TData, TArgs, TError>,
  events:
    | UseAsyncStateEventFn<TData, TArgs, TError>
    | UseAsyncStateEventFn<TData, TArgs, TError>[]
) {
  let nextState = instance.state;
  const changeHandlers: UseAsyncStateEventFn<TData, TArgs, TError>[] = isArray(
    events
  )
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

  let handlers: ((
    props: SubscribeEventProps<TData, TArgs, TError>
  ) => CleanupFn)[] = isArray(events) ? events : [events];

  return handlers.map((handler) => handler(eventProps));
}
