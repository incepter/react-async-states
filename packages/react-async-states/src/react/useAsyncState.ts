import * as React from "react";
import {Producer, Source, State} from "../async-state";
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
} from "../types.internal";
import {StateContext} from "./context";
import {AUTO_RUN} from "./StateHookFlags";
import {__DEV__, emptyArray} from "../shared";
import {calculateStateValue, StateHook} from "./StateHook";
import {useCallerName} from "./helpers/useCallerName";
import {
  ensureStateHookVersionIsLatest,
  useCurrentHook
} from "./helpers/hooks-utils";

export const useAsyncStateBase = function useAsyncStateImpl<T, E, R, S = State<T, E, R>>(
  mixedConfig: MixedConfig<T, E, R, S>,
  deps: any[] = emptyArray,
  overrides?: PartialUseAsyncStateConfiguration<T, E, R, S>,
): UseAsyncState<T, E, R, S> {

  let caller;
  if (__DEV__) {
    caller = useCallerName(4);
  }
  let hook: StateHook<T, E, R, S> = useCurrentHook(caller);
  let [guard, setGuard] = React.useState<number>(0);
  let contextValue = React.useContext<StateContextValue>(StateContext);

  React.useMemo(() => hook.update(1, mixedConfig, contextValue, overrides),
    deps.concat([contextValue, guard]));

  let [selectedValue, setSelectedValue] = React
    .useState<Readonly<UseAsyncState<T, E, R, S>>>(calculateStateValue.bind(null, hook));

  ensureStateHookVersionIsLatest(hook, selectedValue, updateSelectedValue);

  React.useEffect(
    hook.subscribe.bind(null, setGuard, updateSelectedValue),
    [contextValue, hook.flags, hook.instance]
  );

  React.useEffect(autoRunAsyncState, deps);

  return selectedValue;


  function updateSelectedValue() {
    setSelectedValue(calculateStateValue(hook));
    hook.version = hook.instance?.version;
  }

  function autoRunAsyncState(): CleanupFn {
    // auto run only if condition is met, and it is not lazy
    if (!(hook.flags & AUTO_RUN)) {
      return;
    }
    // if dependencies change, if we run, the cleanup shall abort
    let config = (hook.config as BaseConfig<T, E, R>);

    if (config.autoRunArgs && Array.isArray(config.autoRunArgs)) {
      return hook.base.run.apply(null, config.autoRunArgs);
    }
    return hook.base.run();
  }
}


function useAsyncStateExport<T, E, R>(key: string, deps?: any[]): UseAsyncState<T, E, R>
function useAsyncStateExport<T, E, R>(source: Source<T, E, R>, deps?: any[])
function useAsyncStateExport<T, E, R>(producer: Producer<T, E, R>, deps?: any[])
function useAsyncStateExport<T, E, R, S>(
  configWithKeyWithSelector: ConfigWithKeyWithSelector<T, E, R, S>, deps?: any[])
function useAsyncStateExport<T, E, R>(
  configWithKeyWithoutSelector: ConfigWithKeyWithoutSelector<T, E, R>, deps?: any[])
function useAsyncStateExport<T, E, R, S>(
  configWithSourceWithSelector: ConfigWithSourceWithSelector<T, E, R, S>,
  deps?: any[]
)
function useAsyncStateExport<T, E, R>(
  configWithSourceWithoutSelector: ConfigWithSourceWithoutSelector<T, E, R>,
  deps?: any[]
)
function useAsyncStateExport<T, E, R, S>(
  configWithProducerWithSelector: ConfigWithProducerWithSelector<T, E, R, S>,
  deps?: any[]
)
function useAsyncStateExport<T, E, R>(
  configWithProducerWithoutSelector: ConfigWithProducerWithoutSelector<T, E, R>,
  deps?: any[]
): UseAsyncState<T, E, R>
function useAsyncStateExport<T, E, R, S>(
  mixedConfig: MixedConfig<T, E, R, S>, deps?: any[]): UseAsyncState<T, E, R, S>
function useAsyncStateExport<T, E, R, S = State<T, E, R>>(
  mixedConfig: MixedConfig<T, E, R, S>, deps?: any[]): UseAsyncState<T, E, R, S> {
  return useAsyncStateBase(mixedConfig, deps);
}

function useAutoAsyncState<T, E, R, S = State<T, E, R>>(
  subscriptionConfig: MixedConfig<T, E, R, S>,
  dependencies?: any[]
): UseAsyncState<T, E, R, S> {
  return useAsyncStateBase(
    subscriptionConfig,
    dependencies,
    {lazy: false}
  );
}

function useLazyAsyncState<T, E, R, S = State<T, E, R>>(
  subscriptionConfig: MixedConfig<T, E, R, S>,
  dependencies?: any[]
): UseAsyncState<T, E, R, S> {
  return useAsyncStateBase(
    subscriptionConfig,
    dependencies,
    {lazy: true}
  );
}

function useForkAsyncState<T, E, R, S = State<T, E, R>>(
  subscriptionConfig: MixedConfig<T, E, R, S>,
  dependencies?: any[]
): UseAsyncState<T, E, R, S> {
  return useAsyncStateBase(
    subscriptionConfig,
    dependencies,
    {fork: true}
  );
}


function useForkAutoAsyncState<T, E, R, S = State<T, E, R>>(
  subscriptionConfig: MixedConfig<T, E, R, S>,
  dependencies?: any[]
): UseAsyncState<T, E, R, S> {
  return useAsyncStateBase(
    subscriptionConfig,
    dependencies,
    {fork: true, lazy: false}
  );
}

function useHoistAsyncState<T, E, R, S = State<T, E, R>>(
  subscriptionConfig: MixedConfig<T, E, R, S>,
  dependencies?: any[]
): UseAsyncState<T, E, R, S> {
  return useAsyncStateBase(
    subscriptionConfig,
    dependencies,
    {hoist: true}
  );
}

function useHoistAutoAsyncState<T, E, R, S = State<T, E, R>>(
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
