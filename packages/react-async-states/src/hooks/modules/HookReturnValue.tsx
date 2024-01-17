import * as React from "react";
import {
  BaseHooksReturn,
  HookSubscription,
  LegacyHookReturn,
  PartialUseAsyncConfig,
  UseSelector,
} from "../types";
import { State, StateInterface } from "async-states";
import { freeze } from "../../shared";
import HydrationComponent from "./HydrationComponent";

export function createLegacyReturn<TData, TArgs extends unknown[], TError, S>(
  subscription: HookSubscription<TData, TArgs, TError, S>,
  config: PartialUseAsyncConfig<TData, TArgs, TError, S>
): LegacyHookReturn<TData, TArgs, TError, S> {
  return createBaseReturn(subscription, config) as LegacyHookReturn<
    TData,
    TArgs,
    TError,
    S
  >;
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

export function createBaseReturn<TData, TArgs extends unknown[], TError, S>(
  subscription: HookSubscription<TData, TArgs, TError, S>,
  config: PartialUseAsyncConfig<TData, TArgs, TError, S>
): BaseHooksReturn<TData, TArgs, TError, S> {
  let instance = subscription.instance;

  let currentState = instance.state;
  let lastSuccess = instance.lastSuccess;
  let selectedState = selectState(instance, config.selector);

  let previousState =
    currentState.status === "pending" ? currentState.prev : currentState;

  let status = currentState.status;
  let source = subscription.instance.actions;
  return freeze({
    source,

    state: selectedState,
    dataProps: lastSuccess.props,

    isError: status === "error",
    isInitial: status === "initial",
    isPending: status === "pending",
    isSuccess: status === "success",

    data: lastSuccess.data ?? null,
    error: previousState.status === "error" ? previousState.data : null,

    onChange: subscription.onChange,
    onSubscribe: subscription.onSubscribe,
    read: subscription.read.bind(null, config),

    Hydrate: () => <HydrationComponent target={[source]} />,
  });
}

export function selectWholeState<TData, TArgs extends unknown[], TError, S>(
  state: State<TData, TArgs, TError>
): S {
  return state as S;
}
