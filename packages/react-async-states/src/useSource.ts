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

// this is a mini version of useAsyncState
// this hook uses fewer hooks and has fewer capabilities that useAsyncState
// its usage should be when you want to have control over a source
// and you do not intend to have it auto run, dependencies, manage payload
// etc etc.
// this is like useSyncExternalStore, but returns an object with several
// functions that allows controlling the external source. So, may be better ?
// this hook can use directly useSES on the asyncState instance
// but this will require additional memoization to add the other properties
// that UseAsyncState has (abort, mergePayload, invalidateCache, run, replaceState ..)
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
      if (newReturn.state === prev.return.state) {
        return prev;
      }
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
