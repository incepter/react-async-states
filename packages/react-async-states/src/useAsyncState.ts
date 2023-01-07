import * as React from "react";
import {Producer, Source, State} from "async-states";
import {
  BaseConfig,
  CleanupFn,
  ConfigWithKeyWithoutSelector,
  ConfigWithKeyWithSelector,
  ConfigWithProducerWithoutSelector,
  ConfigWithProducerWithSelector,
  ConfigWithSourceWithoutSelector,
  ConfigWithSourceWithSelector,
  MixedConfig,
  PartialUseAsyncStateConfiguration,
  UseAsyncState,
} from "./types.internal";
import {AUTO_RUN, CONFIG_OBJECT} from "./StateHookFlags";
import {__DEV__, emptyArray, humanizeDevFlags, isFunction} from "./shared";
import {
  areHookInputEqual,
  calculateHook,
  calculateStateValue,
  HookOwnState,
  subscribeEffectImpl
} from "./StateHook";
import {useCallerName} from "./helpers/useCallerName";

let is = Object.is;


export const useAsyncStateBase = function useAsyncStateImpl<T, E = any, R = any, S = State<T, E, R>>(
  mixedConfig: MixedConfig<T, E, R, S>,
  deps: any[] = emptyArray,
  overrides?: PartialUseAsyncStateConfiguration<T, E, R, S>,
): UseAsyncState<T, E, R, S> {
  let caller;
  if (__DEV__) {
    caller = useCallerName(4);
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
    return subscribeEffectImpl(hookState, updateState, setGuard, 1);
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

function useAsyncStateExport<T, E = any, R = any>(
  key: string, deps?: any[]): UseAsyncState<T, E, R>
function useAsyncStateExport<T, E = any, R = any>(
  source: Source<T, E, R>, deps?: any[]): UseAsyncState<T, E, R>
function useAsyncStateExport<T, E = any, R = any>(
  producer: Producer<T, E, R>, deps?: any[]): UseAsyncState<T, E, R>
function useAsyncStateExport<T, E = any, R = any, S = State<T, E, R>>(
  configWithKeyWithSelector: ConfigWithKeyWithSelector<T, E, R, S>,
  deps?: any[]
): UseAsyncState<T, E, R, S>
function useAsyncStateExport<T, E = any, R = any>(
  configWithKeyWithoutSelector: ConfigWithKeyWithoutSelector<T, E, R>,
  deps?: any[]
): UseAsyncState<T, E, R>
function useAsyncStateExport<T, E = any, R = any, S = State<T, E, R>>(
  configWithSourceWithSelector: ConfigWithSourceWithSelector<T, E, R, S>,
  deps?: any[]
): UseAsyncState<T, E, R, S>
function useAsyncStateExport<T, E = any, R = any>(
  configWithSourceWithoutSelector: ConfigWithSourceWithoutSelector<T, E, R>,
  deps?: any[]
): UseAsyncState<T, E, R>
function useAsyncStateExport<T, E = any, R = any, S = State<T, E, R>>(
  configWithProducerWithSelector: ConfigWithProducerWithSelector<T, E, R, S>,
  deps?: any[]
): UseAsyncState<T, E, R, S>
function useAsyncStateExport<T, E = any, R = any>(
  configWithProducerWithoutSelector: ConfigWithProducerWithoutSelector<T, E, R>,
  deps?: any[]
): UseAsyncState<T, E, R>
function useAsyncStateExport<T, E = any, R = any, S = State<T, E, R>>(
  mixedConfig: MixedConfig<T, E, R, S>, deps?: any[]): UseAsyncState<T, E, R, S>
function useAsyncStateExport<T, E, R, S = State<T, E, R>>(
  mixedConfig: MixedConfig<T, E, R, S>,
  deps?: any[]
): UseAsyncState<T, E, R, S> {
  return useAsyncStateBase(mixedConfig, deps);
}

function useAutoAsyncState<T, E = any, R = any, S = State<T, E, R>>(
  subscriptionConfig: MixedConfig<T, E, R, S>,
  dependencies?: any[]
): UseAsyncState<T, E, R, S> {
  return useAsyncStateBase(
    subscriptionConfig,
    dependencies,
    {lazy: false}
  );
}

function useLazyAsyncState<T, E = any, R = any, S = State<T, E, R>>(
  subscriptionConfig: MixedConfig<T, E, R, S>,
  dependencies?: any[]
): UseAsyncState<T, E, R, S> {
  return useAsyncStateBase(
    subscriptionConfig,
    dependencies,
    {lazy: true}
  );
}

function useForkAsyncState<T, E = any, R = any, S = State<T, E, R>>(
  subscriptionConfig: MixedConfig<T, E, R, S>,
  dependencies?: any[]
): UseAsyncState<T, E, R, S> {
  return useAsyncStateBase(
    subscriptionConfig,
    dependencies,
    {fork: true}
  );
}


function useForkAutoAsyncState<T, E = any, R = any, S = State<T, E, R>>(
  subscriptionConfig: MixedConfig<T, E, R, S>,
  dependencies?: any[]
): UseAsyncState<T, E, R, S> {
  return useAsyncStateBase(
    subscriptionConfig,
    dependencies,
    {fork: true, lazy: false}
  );
}

useAsyncStateExport.auto = useAutoAsyncState;
useAsyncStateExport.lazy = useLazyAsyncState;
useAsyncStateExport.fork = useForkAsyncState;
useAsyncStateExport.forkAuto = useForkAutoAsyncState;

export const useAsyncState = Object.freeze(useAsyncStateExport);
