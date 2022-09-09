import {useAsyncStateBase} from "./useAsyncStateBase";
import {
  ConfigWithKeyWithoutSelector,
  ConfigWithKeyWithSelector,
  ConfigWithProducerWithoutSelector,
  ConfigWithProducerWithSelector,
  ConfigWithSourceWithoutSelector,
  ConfigWithSourceWithSelector,
  UseAsyncState,
  MixedConfig
} from "../types.internal";
import {AsyncStateKey, AsyncStateSource, Producer, State} from "../async-state";

// the real implementation is in useAsyncStateBase.tsx

// default

function useAsyncStateExport<T>(key: AsyncStateKey, deps?: any[]): UseAsyncState<T>
function useAsyncStateExport<T>(source: AsyncStateSource<T>, deps?: any[])
function useAsyncStateExport<T>(producer: Producer<T>, deps?: any[])
function useAsyncStateExport<T, E>(configWithKeyWithSelector: ConfigWithKeyWithSelector<T, E>, deps?: any[])
function useAsyncStateExport<T>(configWithKeyWithoutSelector: ConfigWithKeyWithoutSelector<T>, deps?: any[])
function useAsyncStateExport<T, E>(configWithSourceWithSelector: ConfigWithSourceWithSelector<T, E>, deps?: any[])
function useAsyncStateExport<T>(configWithSourceWithoutSelector: ConfigWithSourceWithoutSelector<T>, deps?: any[])
function useAsyncStateExport<T, E>(configWithProducerWithSelector: ConfigWithProducerWithSelector<T, E>, deps?: any[])
function useAsyncStateExport<T>(configWithProducerWithoutSelector: ConfigWithProducerWithoutSelector<T>, deps?: any[]): UseAsyncState<T>
function useAsyncStateExport<T, E>(mixedConfig: MixedConfig<T, E>, deps?: any[]): UseAsyncState<T, E>
function useAsyncStateExport<T, E = State<T>>(mixedConfig: MixedConfig<T, E>, deps?: any[]): UseAsyncState<T, E>
{
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
const hoistConfigOverrides = Object.freeze({hoistToProvider: true});

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
  hoistToProvider: true,
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
