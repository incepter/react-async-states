import {
  HookSubscription,
  PartialUseAsyncConfig,
  SubscriptionAlternate,
} from "../types";
import { createLegacyReturn, selectWholeState } from "./HookReturnValue";
import { __DEV__ } from "../../shared";
import { __DEV__unsetHookCallerName } from "./HookSubscriptionUtils";

export function beginRender<TData, TArgs extends unknown[], TError, S>(
  subscription: HookSubscription<TData, TArgs, TError, S>,
  newConfig: PartialUseAsyncConfig<TData, TArgs, TError, S>,
  deps: unknown[]
): SubscriptionAlternate<TData, TArgs, TError, S> | null {
  let instance = subscription.instance;

  // this means that the dependencies did not change and the same config
  // remains from the previous render, or this is the first render.
  if (newConfig === subscription.config) {
    // At this point, there is no need to create the alternate.
    // which will be equivalent to a render bailout. But we'll need to check
    // on the versions in case something bad happened.
    if (subscription.version === instance.version) {
      // null to bail out the render
      completeRender(subscription);
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
    alternate.return = createLegacyReturn(subscription, newConfig);
    // no need to check anything else since this is a fresh value

    completeRender(subscription);
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
      alternate.return = createLegacyReturn(subscription, newConfig);
    }
  }

  completeRender(subscription);
  return alternate;
}

export function completeRender<TData, TArgs extends unknown[], TError, S>(
  subscription: HookSubscription<TData, TArgs, TError, S>
): void {
  if (__DEV__) {
    __DEV__unsetHookCallerName();
  }

  let { config, alternate } = subscription;
  let usedSubscription = alternate || subscription;
  let usedReturn = usedSubscription.return;
  let usedConfig = usedSubscription.config;

  if (usedConfig.concurrent) {
    // Reading via "read" may result in running the instance's producer.
    // So, it is important to reconcile before running.
    // Reconciliation is done inside the "read" function and only
    // when we should run.
    usedReturn.read(true, !!usedConfig.throwError);

    // in case of a render phase run/update, we would need to correct
    // the returned value
    if (subscription.instance.version !== usedSubscription.version) {
      usedSubscription.return = createLegacyReturn(subscription, usedConfig);
    }
  }
}
