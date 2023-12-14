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
import { __DEV__, emptyArray, freeze } from "../shared";
import { Producer, Source, State } from "async-states";
import { __DEV__setHookCallerName } from "./modules/HookSubscription";
import { useCallerName } from "../helpers/useCallerName";
import { useData_internal } from "./useData_internal";

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
function useData_export<T, A extends unknown[], E>(
	config: string,
	deps?: unknown[]
): ModernHookReturn<T, A, E>;
function useData_export<T, A extends unknown[], E>(
	config: Source<T, A, E>,
	deps?: unknown[]
): ModernHookReturn<T, A, E>;
function useData_export<T, A extends unknown[], E>(
	config: Producer<T, A, E>,
	deps?: unknown[]
): ModernHookReturn<T, A, E>;
function useData_export<T, A extends unknown[], E, S>(
	config: ConfigWithKeyWithSelector<T, A, E, S>,
	deps?: unknown[]
): ModernHookReturn<T, A, E, S>;
function useData_export<T, A extends unknown[], E>(
	config: ConfigWithKeyWithoutSelector<T, A, E>,
	deps?: unknown[]
): ModernHookReturn<T, A, E>;
function useData_export<T, A extends unknown[], E, S>(
	config: ConfigWithSourceWithSelector<T, A, E, S>,
	deps?: unknown[]
): ModernHookReturn<T, A, E, S>;
function useData_export<T, A extends unknown[], E>(
	config: ConfigWithSourceWithoutSelector<T, A, E>,
	deps?: unknown[]
): ModernHookReturn<T, A, E>;
function useData_export<T, A extends unknown[], E, S>(
	config: ConfigWithProducerWithSelector<T, A, E, S>,
	deps?: unknown[]
): ModernHookReturn<T, A, E, S>;
function useData_export<T, A extends unknown[], E>(
	config: ConfigWithProducerWithoutSelector<T, A, E>,
	deps?: unknown[]
): ModernHookReturn<T, A, E>;
function useData_export<T, A extends unknown[], E, S>(
	config: MixedConfig<T, A, E, S>,
	deps?: unknown[]
): ModernHookReturn<T, A, E, S>;
//endregion
function useData_export<T, A extends unknown[], E, S>(
	config: MixedConfig<T, A, E, S>,
	deps: unknown[] = emptyArray
): ModernHookReturn<T, A, E, S> {
	if (__DEV__) {
		__DEV__setHookCallerName(useCallerName(4));
	}
	return useData_internal(config, deps);
}

type UseDataParams<T, A extends unknown[], E, S> = Parameters<
	typeof useData_export<T, A, E, S>
>;

type UseDataType<T, A extends unknown[] = [], E = Error, S = State<T, A, E>> = (
	...args: UseDataParams<T, A, E, S>
) => ModernHookReturn<T, A, E, S>;

export const useData = freeze(useData_export);
