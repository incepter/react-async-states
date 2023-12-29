import {
  HookReturnError,
  HookReturnInitial,
  HookReturnPending,
  HookReturnSuccess,
  HookSubscription,
  LegacyHookReturn,
  PartialUseAsyncConfig,
  UseSelector,
} from "../types";
import { __DEV__, freeze } from "../../shared";
import {
  ErrorState,
  InitialState,
  LastSuccessSavedState,
  PendingState,
  State,
  StateInterface,
  SuccessState,
} from "async-states";

export function createSubscriptionLegacyReturn<
  TData,
  TArgs extends unknown[],
  TError,
  S,
>(
  subscription: HookSubscription<TData, TArgs, TError, S>,
  config: PartialUseAsyncConfig<TData, TArgs, TError, S>
): LegacyHookReturn<TData, TArgs, TError, S> {
  let currentStatus = subscription.instance.state.status;

  switch (currentStatus) {
    case "initial": {
      return createLegacyInitialReturn(subscription, config);
    }
    case "pending": {
      return createLegacyPendingReturn(subscription, config);
    }
    case "success": {
      return createLegacySuccessReturn(subscription, config);
    }
    case "error": {
      return createLegacyErrorReturn(subscription, config);
    }
    default: {
      throw new Error("Unknown status " + String(currentStatus));
    }
  }
}

function selectState<TData, TArgs extends unknown[], TError, S>(
  instance: StateInterface<TData, TArgs, TError>,
  selector?: UseSelector<TData, TArgs, TError, S>
): S {
  let { state: currentState, lastSuccess, cache } = instance;
  if (selector) {
    return selector(currentState, lastSuccess, cache);
  } else {
    return currentState as S;
  }
}

export function createLegacyInitialReturn<
  TData,
  TArgs extends unknown[],
  TError,
  S,
>(
  subscription: HookSubscription<TData, TArgs, TError, S>,
  config: PartialUseAsyncConfig<TData, TArgs, TError, S>
): HookReturnInitial<TData, TArgs, TError, S> {
  let instance = subscription.instance;
  let currentState = instance.state as InitialState<TData, TArgs>;
  let selectedState = selectState(instance, config.selector);

  let result = {
    source: instance.actions,

    isError: false,
    isInitial: true,
    isPending: false,
    isSuccess: false,

    error: null,
    state: selectedState,
    data: currentState.data ?? null,

    read: subscription.read,
    onChange: subscription.onChange,
    onSubscribe: subscription.onSubscribe,
  } as const;

  if (__DEV__) {
    let lastSuccess = instance.lastSuccess;
    addLastSuccessDeprecationWarning(subscription, result, lastSuccess);
  }

  return freeze(result);
}

export function createLegacySuccessReturn<
  TData,
  TArgs extends unknown[],
  TError,
  S,
>(
  subscription: HookSubscription<TData, TArgs, TError, S>,
  config: PartialUseAsyncConfig<TData, TArgs, TError, S>
): HookReturnSuccess<TData, TArgs, TError, S> {
  let instance = subscription.instance;
  let currentState = instance.state as SuccessState<TData, TArgs>;
  let selectedState = selectState(instance, config.selector);

  let result = {
    source: instance.actions,

    isError: false,
    isInitial: false,
    isPending: false,
    isSuccess: true,

    error: null,
    state: selectedState,
    data: currentState.data,

    read: subscription.read,
    onChange: subscription.onChange,
    onSubscribe: subscription.onSubscribe,
  } as const;

  if (__DEV__) {
    let lastSuccess = instance.lastSuccess;
    addLastSuccessDeprecationWarning(subscription, result, lastSuccess);
  }

  return freeze(result);
}

export function createLegacyErrorReturn<
  TData,
  TArgs extends unknown[],
  TError,
  S,
>(
  subscription: HookSubscription<TData, TArgs, TError, S>,
  config: PartialUseAsyncConfig<TData, TArgs, TError, S>
): HookReturnError<TData, TArgs, TError, S> {
  let instance = subscription.instance;
  let lastSuccess = instance.lastSuccess;
  let currentState = instance.state as ErrorState<TData, TArgs, TError>;
  let selectedState = selectState(instance, config.selector);

  let result = {
    source: instance.actions,

    isError: true,
    isInitial: false,
    isPending: false,
    isSuccess: false,

    state: selectedState,
    error: currentState.data,
    data: lastSuccess.data ?? null,

    read: subscription.read,
    onChange: subscription.onChange,
    onSubscribe: subscription.onSubscribe,
  } as const;

  if (__DEV__) {
    let lastSuccess = instance.lastSuccess;
    addLastSuccessDeprecationWarning(subscription, result, lastSuccess);
  }

  return freeze(result);
}

export function createLegacyPendingReturn<
  TData,
  TArgs extends unknown[],
  TError,
  S,
>(
  subscription: HookSubscription<TData, TArgs, TError, S>,
  config: PartialUseAsyncConfig<TData, TArgs, TError, S>
): HookReturnPending<TData, TArgs, TError, S> {
  let instance = subscription.instance;
  let lastSuccess = instance.lastSuccess;
  let currentState = instance.state as PendingState<TData, TArgs, TError>;
  let previousState = currentState.prev;
  let selectedState = selectState(instance, config.selector);

  let result = {
    source: instance.actions,

    isError: false,
    isPending: true,
    isInitial: false,
    isSuccess: false,

    state: selectedState,
    data: lastSuccess.data ?? null,
    error: previousState.status === "error" ? previousState.data : null,

    read: subscription.read,
    onChange: subscription.onChange,
    onSubscribe: subscription.onSubscribe,
  } as const;

  if (__DEV__) {
    addLastSuccessDeprecationWarning(subscription, result, lastSuccess);
  }

  return freeze(result);
}

export function selectWholeState<TData, TArgs extends unknown[], TError, S>(
  state: State<TData, TArgs, TError>
): S {
  return state as S;
}

function addLastSuccessDeprecationWarning(
  subscription: HookSubscription<any, any, any, any>,
  result: LegacyHookReturn<any, any, any, any>,
  lastSuccess: LastSuccessSavedState<any, any>
) {
  if (__DEV__) {
    let devSpy = subscription.__DEV__;
    if (!devSpy) {
      subscription.__DEV__ = devSpy = {
        didAddLastSuccessGetter: false,
        didWarnAboutLastSuccessUsage: false,
      };
    }
    if (!devSpy.didAddLastSuccessGetter) {
      devSpy.didAddLastSuccessGetter = true;
      Object.defineProperty(result, "lastSuccess", {
        get() {
          if (!devSpy!.didWarnAboutLastSuccessUsage) {
            devSpy!.didWarnAboutLastSuccessUsage = true;

            console.error(
              "[Warning]: lastSuccess is deprecated in favor of " +
                "useAsync().data. In practice, we only use the data attribute" +
                "from the lastSuccess. Used in component: " +
                subscription.at
            );
          }

          return lastSuccess;
        },
      });
    }
  }
}
