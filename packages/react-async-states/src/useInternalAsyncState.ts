import * as React from "react";
import {State} from "async-states";
import {
  BaseConfig,
  CleanupFn,
  MixedConfig,
  PartialUseAsyncStateConfiguration,
  UseAsyncState,
} from "./types.internal";
import {AUTO_RUN, CONFIG_OBJECT} from "./StateHookFlags";
import {__DEV__, emptyArray, isFunction} from "./shared";
import {
  areHookInputEqual,
  calculateHook,
  calculateStateValue,
  HookOwnState, resolveFlags, resolveInstance,
  subscribeEffectImpl
} from "./StateHook";
import {useCallerName} from "./helpers/useCallerName";

export const useInternalAsyncState = function useAsyncStateImpl<T, E = any, R = any, S = State<T, E, R>>(
  origin: 1 | 2 | 3,
  callerNameLevel: number,
  mixedConfig: MixedConfig<T, E, R, S>,
  deps: any[] = emptyArray,
  overrides?: PartialUseAsyncStateConfiguration<T, E, R, S>,
): UseAsyncState<T, E, R, S> {

  let caller;
  if (__DEV__) {
    caller = useCallerName(callerNameLevel);
  }

  let [guard, setGuard] = React.useState<number>(0);
  let [hookState, setHookState] = React.useState<HookOwnState<T, E, R, S>>(calculateSelfState);

  if (
    hookState.guard !== guard ||
    !areHookInputEqual(hookState.deps, deps)
  ) {
    setHookState(calculateSelfState());
  }

  let {flags, instance, base, renderInfo, config} = hookState;
  if (instance && hookState.return.version !== instance.version) {
    updateState();
  }

  React.useEffect(subscribeEffect, [renderInfo, flags, instance].concat(deps));
  React.useEffect(autoRunAsyncState.bind(null, hookState), deps);

  renderInfo.version = instance?.version;
  renderInfo.current = hookState.return.state;


  return hookState.return;

  function updateState() {
    setHookState(prev => {
      let newReturn = calculateStateValue(flags, config, base, instance);
      return Object.assign({}, prev, {return: newReturn});
    });
  }

  function calculateSelfState(): HookOwnState<T, E, R, S> {
    return calculateHook(mixedConfig, deps, guard, overrides, caller);
  }

  function subscribeEffect() {
    return subscribeEffectImpl(hookState, updateState, setGuard, origin);
  }
}

function autoRunAsyncState<T, E, R, S>(hookState: HookOwnState<T, E, R, S>): CleanupFn {
  let {flags, instance, config, base} = hookState;
  // auto run only if condition is met, and it is not lazy
  if (!(flags & AUTO_RUN)) {
    return;
  }
  // if dependencies change, if we run, the cleanup shall abort
  let shouldRun = true; // AUTO_RUN flag is set only if this is true

  if (flags & CONFIG_OBJECT) {
    let configObject = (config as BaseConfig<T, E, R>);
    if (isFunction(configObject.condition)) {
      let conditionFn = configObject.condition as ((state: State<T, E, R>) => boolean);
      shouldRun = conditionFn(instance!.getState());
    }
  }

  if (shouldRun) {
    if (flags & CONFIG_OBJECT && (config as BaseConfig<T, E, R>).autoRunArgs) {
      let {autoRunArgs} = (config as BaseConfig<T, E, R>);
      if (autoRunArgs && Array.isArray(autoRunArgs)) {
        return base.run.apply(null, autoRunArgs);
      }
    }

    return base.run();
  }
}
