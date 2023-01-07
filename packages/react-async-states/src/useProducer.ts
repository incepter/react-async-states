import * as React from "react";
import {Producer, State} from "async-states";
import {UseAsyncState} from "./types.internal";
import {__DEV__, emptyArray, noop} from "./shared";
import {useCallerName} from "./helpers/useCallerName";
import {
  areHookInputEqual,
  calculateHook,
  calculateStateValue,
  HookOwnState,
  subscribeEffectImpl
} from "./StateHook";

export function useProducer<T, E, R>(
  producer: Producer<T, E, R>,
): UseAsyncState<T, E, R, State<T, E, R>> {
  let caller;
  if (__DEV__) {
    caller = useCallerName(3);
  }

  let [hookState, setHookState] = React
    .useState<HookOwnState<T, E, R, State<T, E, R>>>(calculateSelfState);

  if (!areHookInputEqual(hookState.deps, emptyArray)) {
    setHookState(calculateSelfState());
  }

  let {flags, instance, base, renderInfo, config} = hookState;

  if (instance && hookState.return.version !== instance.version) {
    updateState();
  }

  if (instance!.originalProducer !== producer) {
    instance!.replaceProducer(producer);
  }

  React.useEffect(subscribeEffect, [renderInfo, flags, instance]);

  renderInfo.version = instance?.version;
  renderInfo.current = hookState.return.state;

  return hookState.return;

  function updateState() {
    setHookState(prev => {
      let newReturn = calculateStateValue(flags, config, base, instance);
      return Object.assign({}, prev, {return: newReturn});
    });
  }

  function calculateSelfState(): HookOwnState<T, E, R, State<T, E, R>> {
    return calculateHook(producer, emptyArray, 0, undefined, caller);
  }

  function subscribeEffect() {
    return subscribeEffectImpl(hookState, updateState, noop, 2);
  }
}
