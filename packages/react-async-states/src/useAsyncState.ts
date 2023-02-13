import {Producer, Source, State} from "async-states";
import {
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
import {__DEV__, emptyArray} from "./shared";
import {useInternalAsyncState} from "./useInternalAsyncState";
import {useCallerName} from "./helpers/useCallerName";

export const useAsyncStateBase = function useAsyncStateImpl<T, E = any, R = any, S = State<T, E, R>>(
  mixedConfig: MixedConfig<T, E, R, S>,
  deps: any[] = emptyArray,
  overrides?: PartialUseAsyncStateConfiguration<T, E, R, S>,
): UseAsyncState<T, E, R, S> {
  let caller;
  if (__DEV__) {
    caller = useCallerName(4);
  }
  return useInternalAsyncState(caller, mixedConfig, deps, overrides);
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
