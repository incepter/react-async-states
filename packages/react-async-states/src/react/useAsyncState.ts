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
import {__DEV__} from "../shared";
import {emptyArray, noop} from "./utils";
import {calculateStateValue, StateHook, StateHookImpl} from "./StateHook";

export function useCurrentHook<T, E>(): StateHook<T, E> {
  return React.useMemo<StateHook<T, E>>(createStateHook, emptyArray);
}

export function createStateHook<T, E>(): StateHook<T, E> {
  return new StateHookImpl();
}

export const useAsyncStateBase = function useAsyncStateImpl<T, E = State<T>>(
  mixedConfig: MixedConfig<T, E>,
  deps: any[] = emptyArray,
  overrides?: PartialUseAsyncStateConfiguration<T, E>,
): UseAsyncState<T, E> {

  const hook: StateHook<T, E> = useCurrentHook();
  const [guard, setGuard] = React.useState<number>(0);
  const contextValue = React.useContext<StateContextValue>(AsyncStateContext);

  React.useMemo(() => hook.update(1, mixedConfig, contextValue, overrides, 8),
    [contextValue, guard, ...deps]);

  const [selectedValue, setSelectedValue] = React
    .useState<Readonly<UseAsyncState<T, E>>>(calculateStateValue.bind(null, hook));

  if (
    selectedValue.version !== hook.instance?.version ||
    selectedValue.source !== hook.instance?._source
  ) {
    updateSelectedValue();
  }

  if (hook.current !== selectedValue.state) {
    hook.current = selectedValue.state;
  }
  if (hook.version !== selectedValue.version) {
    hook.version = selectedValue.version;
  }

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
      return hook.base.run(...config.autoRunArgs);
    }
    return hook.base.run();
  }
}


// this is a mini version of useAsyncState
// this hook uses fewer hooks and has fewer capabilities that useAsyncState
// its usage should be when you want to have control over a source
// and you do not intend to have it auto run, dependencies, manage payload
// etc etc.
// this is like useSyncExternalStore, but returns an object with several
// functions that allows controlling the external source. So, may be better ?
// this hook can use directly useSES on the asyncState instance
// but this will require additional memoization to add the other properties
// that UseAsyncState has (abort, mergePayload, invalidateCache, run, replaceState ...)
export function useSource<T>(
  source: Source<T>
): UseAsyncState<T, State<T>> {
  return useSourceLane(source, undefined, __DEV__ ? 9 : undefined);
}

export function useSourceLane<T>(
  source: Source<T>,
  lane?: string,
  level: number = 8, // used in dev mode only
): UseAsyncState<T, State<T>> {
  const hook: StateHook<T, State<T>> = useCurrentHook();
  const contextValue = React.useContext<StateContextValue>(AsyncStateContext);

  React.useMemo(() => hook.update(2, source, contextValue, {lane}, level),
    [contextValue, lane]);

  const [selectedValue, setSelectedValue] = React
    .useState<Readonly<UseAsyncState<T, State<T>>>>(calculateStateValue.bind(null, hook));

  if (
    selectedValue.version !== hook.instance?.version ||
    selectedValue.source !== hook.instance?._source
  ) {
    updateSelectedValue();
  }

  if (hook.current !== selectedValue.state) {
    hook.current = selectedValue.state;
  }
  if (hook.version !== selectedValue.version) {
    hook.version = selectedValue.version;
  }

  React.useEffect(
    hook.subscribe.bind(null, noop, updateSelectedValue),
    [contextValue, hook.flags, hook.instance]
  );

  return selectedValue;


  function updateSelectedValue() {
    setSelectedValue(calculateStateValue(hook));
    hook.version = hook.instance?.version;
  }

}

// this is a mini version of useAsyncState
// this hook uses fewer hooks and has fewer capabilities that useAsyncState
// its usage should be when you want to have control over a producer (may be inline)
// and you do not intend to have it auto run, dependencies, manage payload
// etc etc.
// this is like useSyncExternalStore, but returns an object with several
// functions that allows controlling the external source. So, may be better ?
// this hook can use directly useSES on the asyncState instance
// but this will require additional memoization to add the other properties
// that UseAsyncState has (abort, mergePayload, invalidateCache, run, replaceState ...)
export function useProducer<T>(
  producer: Producer<T>,
): UseAsyncState<T, State<T>> {
  const hook: StateHook<T, State<T>> = useCurrentHook();
  const contextValue = React.useContext<StateContextValue>(AsyncStateContext);

  React.useMemo(() => hook.update(3, producer, contextValue, undefined, 8), [contextValue]);

  const [selectedValue, setSelectedValue] = React
    .useState<Readonly<UseAsyncState<T, State<T>>>>(calculateStateValue.bind(null, hook));

  if (
    selectedValue.version !== hook.instance?.version ||
    selectedValue.source !== hook.instance?._source
  ) {
    updateSelectedValue();
  }

  if (hook.current !== selectedValue.state) {
    hook.current = selectedValue.state;
  }
  if (hook.version !== selectedValue.version) {
    hook.version = selectedValue.version;
  }

  if (hook.instance!.originalProducer !== producer) {
    hook.instance!.replaceProducer(producer);
  }

  React.useEffect(
    hook.subscribe.bind(null, noop, updateSelectedValue),
    [contextValue, hook.flags, hook.instance]
  );

  return selectedValue;


  function updateSelectedValue() {
    setSelectedValue(calculateStateValue(hook));
    hook.version = hook.instance?.version;
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

// auto runs
const autoConfigOverrides = Object.freeze({lazy: false});

function useAutoAsyncState<T, E = State<T>>(
  subscriptionConfig: MixedConfig<T, E>,
  dependencies?: any[]
): UseAsyncState<T, E> {
  return useAsyncStateBase(
    subscriptionConfig,
    dependencies,
    autoConfigOverrides
  );
}

// lazy
const lazyConfigOverrides = Object.freeze({lazy: true});

function useLazyAsyncState<T, E = State<T>>(
  subscriptionConfig: MixedConfig<T, E>,
  dependencies?: any[]
): UseAsyncState<T, E> {
  return useAsyncStateBase(
    subscriptionConfig,
    dependencies,
    lazyConfigOverrides
  );
}

// fork
const forkConfigOverrides = Object.freeze({fork: true});

function useForkAsyncState<T, E = State<T>>(
  subscriptionConfig: MixedConfig<T, E>,
  dependencies?: any[]
): UseAsyncState<T, E> {
  return useAsyncStateBase(
    subscriptionConfig,
    dependencies,
    forkConfigOverrides
  );
}

// fork auto
const forkAutoConfigOverrides = Object.freeze({fork: true, lazy: false});

function useForkAutoAsyncState<T, E = State<T>>(
  subscriptionConfig: MixedConfig<T, E>,
  dependencies?: any[]
): UseAsyncState<T, E> {
  return useAsyncStateBase(
    subscriptionConfig,
    dependencies,
    forkAutoConfigOverrides
  );
}

// hoist
const hoistConfigOverrides = Object.freeze({hoist: true});

function useHoistAsyncState<T, E = State<T>>(
  subscriptionConfig: MixedConfig<T, E>,
  dependencies?: any[]
): UseAsyncState<T, E> {
  return useAsyncStateBase(
    subscriptionConfig,
    dependencies,
    hoistConfigOverrides
  );
}

// hoistAuto
const hoistAutoConfigOverrides = Object.freeze({
  hoist: true,
  lazy: false
});

function useHoistAutoAsyncState<T, E = State<T>>(
  subscriptionConfig: MixedConfig<T, E>,
  dependencies?: any[]
): UseAsyncState<T, E> {
  return useAsyncStateBase(
    subscriptionConfig,
    dependencies,
    hoistAutoConfigOverrides
  );
}

useAsyncStateExport.auto = useAutoAsyncState;
useAsyncStateExport.lazy = useLazyAsyncState;
useAsyncStateExport.fork = useForkAsyncState;
useAsyncStateExport.hoist = useHoistAsyncState;
useAsyncStateExport.forkAuto = useForkAutoAsyncState;
useAsyncStateExport.hoistAuto = useHoistAutoAsyncState;

export const useAsyncState = Object.freeze(useAsyncStateExport);
