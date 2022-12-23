import * as React from "react";
import {Producer, Source, State} from "@core";
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
  StateContextValue,
  UseAsyncState,
} from "./types.internal";
import {StateContext} from "./context";
import {AUTO_RUN} from "./StateHookFlags";
import {__DEV__, emptyArray, isFunction} from "./shared";
import {calculateStateValue, StateHook} from "./StateHook";
import {useCallerName} from "./helpers/useCallerName";
import {
  ensureStateHookVersionIsLatest,
  useCurrentHook
} from "./helpers/hooks-utils";

export const useAsyncStateBase = function useAsyncStateImpl<T, E = any, R = any, S = State<T, E, R>>(
  mixedConfig: MixedConfig<T, E, R, S>,
  deps: any[] = emptyArray,
  overrides?: PartialUseAsyncStateConfiguration<T, E, R, S>,
): UseAsyncState<T, E, R, S> {

  let caller;
  if (__DEV__) {
    caller = useCallerName(4);
  }
  let hook: StateHook<T, E, R, S> = useCurrentHook(caller);
  let {flags, instance} = hook;

  let [guard, setGuard] = React.useState<number>(0);
  let contextValue = React.useContext<StateContextValue>(StateContext);

  React.useMemo(() => hook.update(1, mixedConfig, contextValue, overrides),
    deps.concat([contextValue, guard]));

  let [selectedValue, setSelectedValue] = React
    .useState<Readonly<UseAsyncState<T, E, R, S>>>(() => calculateStateValue(hook));

  ensureStateHookVersionIsLatest(hook, selectedValue, updateSelectedValue);

  React.useEffect(
    hook.subscribe.bind(null, setGuard, updateSelectedValue),
    [contextValue, flags, instance]
  );

  React.useEffect(autoRunAsyncState, deps);

  return selectedValue;


  function updateSelectedValue() {
    setSelectedValue(calculateStateValue(hook));
    hook.version = instance?.version;
  }

  function autoRunAsyncState(): CleanupFn {
    let {flags, instance} = hook;
    // auto run only if condition is met, and it is not lazy
    if (!(flags & AUTO_RUN)) {
      return;
    }
    // if dependencies change, if we run, the cleanup shall abort
    let config = (hook.config as BaseConfig<T, E, R>);
    let shouldRun = true; // AUTO_RUN flag is set only if this is true

    if (isFunction(config.condition)) {
      let conditionFn = config.condition as ((state: State<T, E, R>) => boolean);
      shouldRun = conditionFn(instance!.getState());
    }

    if (shouldRun) {
      if (config.autoRunArgs && Array.isArray(config.autoRunArgs)) {
        return hook.base.run.apply(null, config.autoRunArgs);
      }
      return hook.base.run();
    }
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

function useHoistAsyncState<T, E = any, R = any, S = State<T, E, R>>(
  subscriptionConfig: MixedConfig<T, E, R, S>,
  dependencies?: any[]
): UseAsyncState<T, E, R, S> {
  return useAsyncStateBase(
    subscriptionConfig,
    dependencies,
    {hoist: true}
  );
}

function useHoistAutoAsyncState<T, E = any, R = any, S = State<T, E, R>>(
  subscriptionConfig: MixedConfig<T, E, R, S>,
  dependencies?: any[]
): UseAsyncState<T, E, R, S> {
  return useAsyncStateBase(
    subscriptionConfig,
    dependencies,
    {hoist: true, lazy: false}
  );
}

useAsyncStateExport.auto = useAutoAsyncState;
useAsyncStateExport.lazy = useLazyAsyncState;
useAsyncStateExport.fork = useForkAsyncState;
useAsyncStateExport.hoist = useHoistAsyncState;
useAsyncStateExport.forkAuto = useForkAutoAsyncState;
useAsyncStateExport.hoistAuto = useHoistAutoAsyncState;

export const useAsyncState = Object.freeze(useAsyncStateExport);
