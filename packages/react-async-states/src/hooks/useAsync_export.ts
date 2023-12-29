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
function useAsync_export<TData, TArgs extends unknown[], TError>(
  config: string,
  deps?: unknown[]
): UseAsyncState<TData, TArgs, TError>;
function useAsync_export<TData, TArgs extends unknown[], TError>(
  config: Source<TData, TArgs, TError>,
  deps?: unknown[]
): UseAsyncState<TData, TArgs, TError>;
function useAsync_export<TData, TArgs extends unknown[], TError>(
  config: Producer<TData, TArgs, TError>,
  deps?: unknown[]
): UseAsyncState<TData, TArgs, TError>;
function useAsync_export<TData, TArgs extends unknown[], TError, S>(
  config: ConfigWithKeyWithSelector<TData, TArgs, TError, S>,
  deps?: unknown[]
): UseAsyncState<TData, TArgs, TError, S>;
function useAsync_export<TData, TArgs extends unknown[], TError>(
  config: ConfigWithKeyWithoutSelector<TData, TArgs, TError>,
  deps?: unknown[]
): UseAsyncState<TData, TArgs, TError>;
function useAsync_export<TData, TArgs extends unknown[], TError, S>(
  config: ConfigWithSourceWithSelector<TData, TArgs, TError, S>,
  deps?: unknown[]
): UseAsyncState<TData, TArgs, TError, S>;
function useAsync_export<TData, TArgs extends unknown[], TError>(
  config: ConfigWithSourceWithoutSelector<TData, TArgs, TError>,
  deps?: unknown[]
): UseAsyncState<TData, TArgs, TError>;
function useAsync_export<TData, TArgs extends unknown[], TError, S>(
  config: ConfigWithProducerWithSelector<TData, TArgs, TError, S>,
  deps?: unknown[]
): UseAsyncState<TData, TArgs, TError, S>;
function useAsync_export<TData, TArgs extends unknown[], TError>(
  config: ConfigWithProducerWithoutSelector<TData, TArgs, TError>,
  deps?: unknown[]
): UseAsyncState<TData, TArgs, TError>;
function useAsync_export<TData, TArgs extends unknown[], TError, S>(
  config: MixedConfig<TData, TArgs, TError, S>,
  deps?: unknown[]
): UseAsyncState<TData, TArgs, TError, S>;
//endregion
function useAsync_export<TData, TArgs extends unknown[], TError, S>(
  config: MixedConfig<TData, TArgs, TError, S>,
  deps: unknown[] = emptyArray
): UseAsyncState<TData, TArgs, TError, S> {
  if (__DEV__) {
    __DEV__setHookCallerName(useCallerName(3));
  }
  return useAsync_internal(config, deps);
}

// we avoid creating this object everytime, so it is created on-demand
// and then reused when necessary
let autoRunOverride: { lazy: false } | null = null;

function useAuto<TData, TArgs extends unknown[], TError, S>(
  config: MixedConfig<TData, TArgs, TError, S>,
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
type UseAsyncReturn<TData, TArgs extends unknown[], TError, S> = ReturnType<
  typeof useAsync_export<TData, TArgs, TError, S>
>;

type UseAsyncParams<TData, TArgs extends unknown[], TError, S> = Parameters<
  typeof useAsync_export<TData, TArgs, TError, S>
>;

type UseAsyncType = {
  <TData, TArgs extends unknown[] = [], TError = Error, S = State<TData, TArgs, TError>>(
    ...args: UseAsyncParams<TData, TArgs, TError, S>
  ): UseAsyncReturn<TData, TArgs, TError, S>;

  auto<TData, TArgs extends unknown[] = [], TError = Error, S = State<TData, TArgs, TError>>(
    ...args: UseAsyncParams<TData, TArgs, TError, S>
  ): UseAsyncReturn<TData, TArgs, TError, S>;
};

useAsync_export.auto = useAuto;
export const useAsync: UseAsyncType = freeze(useAsync_export);

// keep this for historical reasons
export const useAsyncState = useAsync;
