import {
  ConfigWithKeyWithoutSelector,
  ConfigWithKeyWithSelector,
  ConfigWithProducerWithoutSelector,
  ConfigWithProducerWithSelector,
  ConfigWithSourceWithoutSelector,
  ConfigWithSourceWithSelector,
  MixedConfig,
  UseAsyncState,
} from "./types";
import { __DEV__, emptyArray, freeze } from "../shared";
import { useAsync_internal } from "./useAsync_internal";
import { Producer, Source, State } from "async-states";
import { __DEV__setHookCallerName } from "./modules/HookSubscription";
import { useCallerName } from "../helpers/useCallerName";

// now we should overload and construct the exported part of this hook
// the main usage that we should overload
// - when config is a string, S = State
// - when config is a function, S = State
// - when config is a source, S = State
// - otherwise, config is an object
// when config is an object:
// - we may have a key, and maybe a selector
// - we may have a producer, and maybe a selector
// - we may have a source, and maybe a selector
// - we may have nothing, and maybe a selector
// - we may have an initial value everytime
// - we may have a selector everytime
// so, let's make enough overloads

// this is the main function that will be exported to user land.
// it supports all the previous overloads and adds two special shortcuts:
// - useAsync.auto(...same) : inject a lazy: false configuration override
// - useAsync.lazy(...same) : forces the lazy: true configuration
//region useAsyncOverloads
function useAsync_export<T, A extends unknown[], E>(
  config: string,
  deps?: unknown[]
): UseAsyncState<T, A, E>;
function useAsync_export<T, A extends unknown[], E>(
  config: Source<T, A, E>,
  deps?: unknown[]
): UseAsyncState<T, A, E>;
function useAsync_export<T, A extends unknown[], E>(
  config: Producer<T, A, E>,
  deps?: unknown[]
): UseAsyncState<T, A, E>;
function useAsync_export<T, A extends unknown[], E, S>(
  config: ConfigWithKeyWithSelector<T, A, E, S>,
  deps?: unknown[]
): UseAsyncState<T, A, E, S>;
function useAsync_export<T, A extends unknown[], E>(
  config: ConfigWithKeyWithoutSelector<T, A, E>,
  deps?: unknown[]
): UseAsyncState<T, A, E>;
function useAsync_export<T, A extends unknown[], E, S>(
  config: ConfigWithSourceWithSelector<T, A, E, S>,
  deps?: unknown[]
): UseAsyncState<T, A, E, S>;
function useAsync_export<T, A extends unknown[], E>(
  config: ConfigWithSourceWithoutSelector<T, A, E>,
  deps?: unknown[]
): UseAsyncState<T, A, E>;
function useAsync_export<T, A extends unknown[], E, S>(
  config: ConfigWithProducerWithSelector<T, A, E, S>,
  deps?: unknown[]
): UseAsyncState<T, A, E, S>;
function useAsync_export<T, A extends unknown[], E>(
  config: ConfigWithProducerWithoutSelector<T, A, E>,
  deps?: unknown[]
): UseAsyncState<T, A, E>;
function useAsync_export<T, A extends unknown[], E, S>(
  config: MixedConfig<T, A, E, S>,
  deps?: unknown[]
): UseAsyncState<T, A, E, S>;
//endregion
function useAsync_export<T, A extends unknown[], E, S>(
  config: MixedConfig<T, A, E, S>,
  deps: unknown[] = emptyArray
): UseAsyncState<T, A, E, S> {
  if (__DEV__) {
    __DEV__setHookCallerName(useCallerName(3));
  }
  return useAsync_internal(config, deps);
}

// we avoid creating this object everytime, so it is created on-demand
// and then reused when necessary
let autoRunOverride: { lazy: false } | null = null;

function useAuto<T, A extends unknown[], E, S>(
  config: MixedConfig<T, A, E, S>,
  deps: unknown[] = emptyArray
) {
  if (__DEV__) {
    __DEV__setHookCallerName(useCallerName(3));
  }
  if (!autoRunOverride) {
    autoRunOverride = { lazy: false };
  }
  // this override will be restored to null inside useAsync_export()
  return useAsync_internal(config, deps, autoRunOverride);
}

// keep these types here next to useAsync_export
type UseAsyncReturn<T, A extends unknown[], E, S> = ReturnType<
  typeof useAsync_export<T, A, E, S>
>;

type UseAsyncParams<T, A extends unknown[], E, S> = Parameters<
  typeof useAsync_export<T, A, E, S>
>;

type UseAsyncType = {
  <T, A extends unknown[] = [], E = Error, S = State<T, A, E>>(
    ...args: UseAsyncParams<T, A, E, S>
  ): UseAsyncReturn<T, A, E, S>;

  auto<T, A extends unknown[] = [], E = Error, S = State<T, A, E>>(
    ...args: UseAsyncParams<T, A, E, S>
  ): UseAsyncReturn<T, A, E, S>;
};

useAsync_export.auto = useAuto;
export const useAsync: UseAsyncType = freeze(useAsync_export);

// keep this for historical reasons
export const useAsyncState = useAsync;
