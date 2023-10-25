import { Producer, Source, State } from "async-states";
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
import { __DEV__, emptyArray } from "./shared";
import { useInternalAsyncState } from "./useInternalAsyncState";
import { useCallerName } from "./helpers/useCallerName";
import { useAsync_internal } from "./hooks/useAsync";
import { __DEV__setHookCallerName } from "./hooks/modules/HookSubscription";

export const useAsyncBase = function useAsyncImpl<
	T,
	E = unknown,
	A extends unknown[] = unknown[],
	S = State<T, E, A>
>(
	mixedConfig: MixedConfig<T, E, A, S>,
	deps: any[] = emptyArray,
	overrides?: PartialUseAsyncStateConfiguration<T, E, A, S>
): UseAsyncState<T, E, A, S> {
	if (__DEV__) {
		__DEV__setHookCallerName(useCallerName(4));
	}

	return useAsync_internal(mixedConfig, deps, overrides);
};

function useAsyncExport<T, E = unknown, A extends unknown[] = unknown[]>(
	key: string,
	deps?: any[]
): UseAsyncState<T, E, A>;
function useAsyncExport<T, E = unknown, A extends unknown[] = unknown[]>(
	source: Source<T, E, A>,
	deps?: any[]
): UseAsyncState<T, E, A>;
function useAsyncExport<T, E = unknown, A extends unknown[] = unknown[]>(
	producer: Producer<T, E, A>,
	deps?: any[]
): UseAsyncState<T, E, A>;
function useAsyncExport<
	T,
	E = unknown,
	A extends unknown[] = unknown[],
	S = State<T, E, A>
>(
	configWithKeyWithSelector: ConfigWithKeyWithSelector<T, E, A, S>,
	deps?: any[]
): UseAsyncState<T, E, A, S>;
function useAsyncExport<T, E = unknown, A extends unknown[] = unknown[]>(
	configWithKeyWithoutSelector: ConfigWithKeyWithoutSelector<T, E, A>,
	deps?: any[]
): UseAsyncState<T, E, A>;
function useAsyncExport<
	T,
	E = unknown,
	A extends unknown[] = unknown[],
	S = State<T, E, A>
>(
	configWithSourceWithSelector: ConfigWithSourceWithSelector<T, E, A, S>,
	deps?: any[]
): UseAsyncState<T, E, A, S>;
function useAsyncExport<T, E = unknown, A extends unknown[] = unknown[]>(
	configWithSourceWithoutSelector: ConfigWithSourceWithoutSelector<T, E, A>,
	deps?: any[]
): UseAsyncState<T, E, A>;
function useAsyncExport<
	T,
	E = unknown,
	A extends unknown[] = unknown[],
	S = State<T, E, A>
>(
	configWithProducerWithSelector: ConfigWithProducerWithSelector<T, E, A, S>,
	deps?: any[]
): UseAsyncState<T, E, A, S>;
function useAsyncExport<T, E = unknown, A extends unknown[] = unknown[]>(
	configWithProducerWithoutSelector: ConfigWithProducerWithoutSelector<T, E, A>,
	deps?: any[]
): UseAsyncState<T, E, A>;
function useAsyncExport<
	T,
	E = unknown,
	A extends unknown[] = unknown[],
	S = State<T, E, A>
>(
	mixedConfig: MixedConfig<T, E, A, S>,
	deps?: any[]
): UseAsyncState<T, E, A, S>;
function useAsyncExport<T, E, A extends unknown[], S = State<T, E, A>>(
	mixedConfig: MixedConfig<T, E, A, S>,
	deps?: any[]
): UseAsyncState<T, E, A, S> {
	return useAsyncBase(mixedConfig, deps);
}

function useAutoAsync<
	T,
	E = unknown,
	A extends unknown[] = unknown[],
	S = State<T, E, A>
>(
	subscriptionConfig: MixedConfig<T, E, A, S>,
	dependencies?: any[]
): UseAsyncState<T, E, A, S> {
	return useAsyncBase(subscriptionConfig, dependencies, { lazy: false });
}

function useLazyAsync<
	T,
	E = unknown,
	A extends unknown[] = unknown[],
	S = State<T, E, A>
>(
	subscriptionConfig: MixedConfig<T, E, A, S>,
	dependencies?: any[]
): UseAsyncState<T, E, A, S> {
	return useAsyncBase(subscriptionConfig, dependencies, { lazy: true });
}

useAsyncExport.auto = useAutoAsync;
useAsyncExport.lazy = useLazyAsync;

export const useAsync = Object.freeze(useAsyncExport);
