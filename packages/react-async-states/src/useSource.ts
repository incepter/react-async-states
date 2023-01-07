import * as React from "react";
import {Source, State} from "async-states";
import {UseAsyncState} from "./types.internal";
import {__DEV__, noop} from "./shared";
import {useCallerName} from "./helpers/useCallerName";
import {
  areHookInputEqual,
  calculateHook,
  calculateStateValue,
  HookOwnState,
  subscribeEffectImpl
} from "./StateHook";

export const useSource = useSourceLane;

export function useSourceLane<T, E, R>(
  source: Source<T, E, R>,
  lane?: string,
): UseAsyncState<T, E, R, State<T, E, R>> {
  let caller;
  if (__DEV__) {
    caller = useCallerName(3);
  }

  let [hookState, setHookState] = React
    .useState<HookOwnState<T, E, R, State<T, E, R>>>(calculateSelfState);

  if (!areHookInputEqual(hookState.deps, [source, lane])) {
    setHookState(calculateSelfState());
  }

  let {flags, instance, base, renderInfo, config} = hookState;
  if (instance && hookState.return.version !== instance.version) {
    updateState();
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
    return calculateHook(source, [source, lane], 0, {lane}, caller);
  }

  function subscribeEffect() {
    return subscribeEffectImpl(hookState, updateState, noop, 2);
  }
}
