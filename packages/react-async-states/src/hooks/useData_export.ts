import {
  ConfigWithKeyWithoutSelector,
  ConfigWithKeyWithSelector,
  ConfigWithProducerWithoutSelector,
  ConfigWithProducerWithSelector,
  ConfigWithSourceWithoutSelector,
  ConfigWithSourceWithSelector,
  MixedConfig,
  ModernHookReturn,
} from "./types";
import { __DEV__, emptyArray } from "../shared";
import { Producer, Source } from "async-states";
import { useCallerName } from "../helpers/useCallerName";
import { useData_internal } from "./useData_internal";
import { __DEV__setHookCallerName } from "./modules/HookSubscriptionUtils";

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

//region useDataOverloads
export function useData<TData, TArgs extends unknown[], TError>(
  config: string,
  deps?: unknown[]
): ModernHookReturn<TData, TArgs, TError>;
export function useData<TData, TArgs extends unknown[], TError>(
  config: Source<TData, TArgs, TError>,
  deps?: unknown[]
): ModernHookReturn<TData, TArgs, TError>;
export function useData<TData, TArgs extends unknown[], TError>(
  config: Producer<TData, TArgs, TError>,
  deps?: unknown[]
): ModernHookReturn<TData, TArgs, TError>;
export function useData<TData, TArgs extends unknown[], TError, S>(
  config: ConfigWithKeyWithSelector<TData, TArgs, TError, S>,
  deps?: unknown[]
): ModernHookReturn<TData, TArgs, TError, S>;
export function useData<TData, TArgs extends unknown[], TError>(
  config: ConfigWithKeyWithoutSelector<TData, TArgs, TError>,
  deps?: unknown[]
): ModernHookReturn<TData, TArgs, TError>;
export function useData<TData, TArgs extends unknown[], TError, S>(
  config: ConfigWithSourceWithSelector<TData, TArgs, TError, S>,
  deps?: unknown[]
): ModernHookReturn<TData, TArgs, TError, S>;
export function useData<TData, TArgs extends unknown[], TError>(
  config: ConfigWithSourceWithoutSelector<TData, TArgs, TError>,
  deps?: unknown[]
): ModernHookReturn<TData, TArgs, TError>;
export function useData<TData, TArgs extends unknown[], TError, S>(
  config: ConfigWithProducerWithSelector<TData, TArgs, TError, S>,
  deps?: unknown[]
): ModernHookReturn<TData, TArgs, TError, S>;
export function useData<TData, TArgs extends unknown[], TError>(
  config: ConfigWithProducerWithoutSelector<TData, TArgs, TError>,
  deps?: unknown[]
): ModernHookReturn<TData, TArgs, TError>;
export function useData<TData, TArgs extends unknown[], TError, S>(
  config: MixedConfig<TData, TArgs, TError, S>,
  deps?: unknown[]
): ModernHookReturn<TData, TArgs, TError, S>;
//endregion
export function useData<TData, TArgs extends unknown[], TError, S>(
  config: MixedConfig<TData, TArgs, TError, S>,
  deps: unknown[] = emptyArray
): ModernHookReturn<TData, TArgs, TError, S> {
  if (__DEV__) {
    __DEV__setHookCallerName(useCallerName(3));
  }
  return useData_internal(config, deps);
}
