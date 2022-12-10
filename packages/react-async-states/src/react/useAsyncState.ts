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
import {AsyncStateContext} from "./context";
import {AUTO_RUN} from "./StateHookFlags";
import {__DEV__, emptyArray} from "../shared";
import {calculateStateValue, StateHook} from "./StateHook";
import {useCallerName} from "./helpers/useCallerName";
import {
  ensureStateHookVersionIsLatest,
  useCurrentHook
} from "./helpers/hooks-utils";

export const useAsyncStateBase = function useAsyncStateImpl<T, E = State<T>>(
  mixedConfig: MixedConfig<T, E>,
  deps: any[] = emptyArray,
  overrides?: PartialUseAsyncStateConfiguration<T, E>,
): UseAsyncState<T, E> {

  let caller;
  if (__DEV__) {
    caller = useCallerName(4);
  }
  let hook: StateHook<T, E> = useCurrentHook(caller);
  let [guard, setGuard] = React.useState<number>(0);
  let contextValue = React.useContext<StateContextValue>(AsyncStateContext);

  React.useMemo(() => hook.update(1, mixedConfig, contextValue, overrides),
    deps.concat([contextValue, guard]));

  let [selectedValue, setSelectedValue] = React
    .useState<Readonly<UseAsyncState<T, E>>>(calculateStateValue.bind(null, hook));

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
    let config = (hook.config as BaseConfig<T>);

    if (config.autoRunArgs && Array.isArray(config.autoRunArgs)) {
      return hook.base.run.apply(null, config.autoRunArgs);
    }
    return hook.base.run();
  }
}


function useAsyncStateExport<T>(key: string, deps?: any[]): UseAsyncState<T>
function useAsyncStateExport<T>(source: Source<T>, deps?: any[])
function useAsyncStateExport<T>(producer: Producer<T>, deps?: any[])
function useAsyncStateExport<T, E>(
  configWithKeyWithSelector: ConfigWithKeyWithSelector<T, E>, deps?: any[])
function useAsyncStateExport<T>(
  configWithKeyWithoutSelector: ConfigWithKeyWithoutSelector<T>, deps?: any[])
function useAsyncStateExport<T, E>(
  configWithSourceWithSelector: ConfigWithSourceWithSelector<T, E>,
  deps?: any[]
)
function useAsyncStateExport<T>(
  configWithSourceWithoutSelector: ConfigWithSourceWithoutSelector<T>,
  deps?: any[]
)
function useAsyncStateExport<T, E>(
  configWithProducerWithSelector: ConfigWithProducerWithSelector<T, E>,
  deps?: any[]
)
function useAsyncStateExport<T>(
  configWithProducerWithoutSelector: ConfigWithProducerWithoutSelector<T>,
  deps?: any[]
): UseAsyncState<T>
function useAsyncStateExport<T, E>(
  mixedConfig: MixedConfig<T, E>, deps?: any[]): UseAsyncState<T, E>
function useAsyncStateExport<T, E = State<T>>(
  mixedConfig: MixedConfig<T, E>, deps?: any[]): UseAsyncState<T, E> {
  return useAsyncStateBase(mixedConfig, deps);
}

function useAutoAsyncState<T, E = State<T>>(
  subscriptionConfig: MixedConfig<T, E>,
  dependencies?: any[]
): UseAsyncState<T, E> {
  return useAsyncStateBase(
    subscriptionConfig,
    dependencies,
    {lazy: false}
  );
}

function useLazyAsyncState<T, E = State<T>>(
  subscriptionConfig: MixedConfig<T, E>,
  dependencies?: any[]
): UseAsyncState<T, E> {
  return useAsyncStateBase(
    subscriptionConfig,
    dependencies,
    {lazy: true}
  );
}

function useForkAsyncState<T, E = State<T>>(
  subscriptionConfig: MixedConfig<T, E>,
  dependencies?: any[]
): UseAsyncState<T, E> {
  return useAsyncStateBase(
    subscriptionConfig,
    dependencies,
    {fork: true}
  );
}


function useForkAutoAsyncState<T, E = State<T>>(
  subscriptionConfig: MixedConfig<T, E>,
  dependencies?: any[]
): UseAsyncState<T, E> {
  return useAsyncStateBase(
    subscriptionConfig,
    dependencies,
    {fork: true, lazy: false}
  );
}

function useHoistAsyncState<T, E = State<T>>(
  subscriptionConfig: MixedConfig<T, E>,
  dependencies?: any[]
): UseAsyncState<T, E> {
  return useAsyncStateBase(
    subscriptionConfig,
    dependencies,
    {hoist: true}
  );
}

function useHoistAutoAsyncState<T, E = State<T>>(
  subscriptionConfig: MixedConfig<T, E>,
  dependencies?: any[]
): UseAsyncState<T, E> {
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
