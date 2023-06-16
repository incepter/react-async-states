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

export const useAsyncBase = function useAsyncImpl<
	T,
	E = unknown,
	R = unknown,
	A extends unknown[] = unknown[],
	S = State<T, E, R, A>
>(
	mixedConfig: MixedConfig<T, E, R, A, S>,
	deps: any[] = emptyArray,
	overrides?: PartialUseAsyncStateConfiguration<T, E, R, A, S>
): UseAsyncState<T, E, R, A, S> {
	let caller;
	if (__DEV__) {
		caller = useCallerName(4);
	}
	return useInternalAsyncState(caller, mixedConfig, deps, overrides);
};

function useAsyncExport<
	T,
	E = unknown,
	R = unknown,
	A extends unknown[] = unknown[]
>(key: string, deps?: any[]): UseAsyncState<T, E, R, A>;
function useAsyncExport<
	T,
	E = unknown,
	R = unknown,
	A extends unknown[] = unknown[]
>(source: Source<T, E, R, A>, deps?: any[]): UseAsyncState<T, E, R, A>;
function useAsyncExport<
	T,
	E = unknown,
	R = unknown,
	A extends unknown[] = unknown[]
>(producer: Producer<T, E, R, A>, deps?: any[]): UseAsyncState<T, E, R, A>;
function useAsyncExport<
	T,
	E = unknown,
	R = unknown,
	A extends unknown[] = unknown[],
	S = State<T, E, R, A>
>(
	configWithKeyWithSelector: ConfigWithKeyWithSelector<T, E, R, A, S>,
	deps?: any[]
): UseAsyncState<T, E, R, A, S>;
function useAsyncExport<
	T,
	E = unknown,
	R = unknown,
	A extends unknown[] = unknown[]
>(
	configWithKeyWithoutSelector: ConfigWithKeyWithoutSelector<T, E, R, A>,
	deps?: any[]
): UseAsyncState<T, E, R, A>;
function useAsyncExport<
	T,
	E = unknown,
	R = unknown,
	A extends unknown[] = unknown[],
	S = State<T, E, R, A>
>(
	configWithSourceWithSelector: ConfigWithSourceWithSelector<T, E, R, A, S>,
	deps?: any[]
): UseAsyncState<T, E, R, A, S>;
function useAsyncExport<
	T,
	E = unknown,
	R = unknown,
	A extends unknown[] = unknown[]
>(
	configWithSourceWithoutSelector: ConfigWithSourceWithoutSelector<T, E, R, A>,
	deps?: any[]
): UseAsyncState<T, E, R, A>;
function useAsyncExport<
	T,
	E = unknown,
	R = unknown,
	A extends unknown[] = unknown[],
	S = State<T, E, R, A>
>(
	configWithProducerWithSelector: ConfigWithProducerWithSelector<T, E, R, A, S>,
	deps?: any[]
): UseAsyncState<T, E, R, A, S>;
function useAsyncExport<
	T,
	E = unknown,
	R = unknown,
	A extends unknown[] = unknown[]
>(
	configWithProducerWithoutSelector: ConfigWithProducerWithoutSelector<
		T,
		E,
		R,
		A
	>,
	deps?: any[]
): UseAsyncState<T, E, R, A>;
function useAsyncExport<
	T,
	E = unknown,
	R = unknown,
	A extends unknown[] = unknown[],
	S = State<T, E, R, A>
>(
	mixedConfig: MixedConfig<T, E, R, A, S>,
	deps?: any[]
): UseAsyncState<T, E, R, A, S>;
function useAsyncExport<T, E, R, A extends unknown[], S = State<T, E, R, A>>(
	mixedConfig: MixedConfig<T, E, R, A, S>,
	deps?: any[]
): UseAsyncState<T, E, R, A, S> {
	return useAsyncBase(mixedConfig, deps);
}

function useAutoAsync<
	T,
	E = unknown,
	R = unknown,
	A extends unknown[] = unknown[],
	S = State<T, E, R, A>
>(
	subscriptionConfig: MixedConfig<T, E, R, A, S>,
	dependencies?: any[]
): UseAsyncState<T, E, R, A, S> {
	return useAsyncBase(subscriptionConfig, dependencies, { lazy: false });
}

function useLazyAsync<
	T,
	E = unknown,
	R = unknown,
	A extends unknown[] = unknown[],
	S = State<T, E, R, A>
>(
	subscriptionConfig: MixedConfig<T, E, R, A, S>,
	dependencies?: any[]
): UseAsyncState<T, E, R, A, S> {
	return useAsyncBase(subscriptionConfig, dependencies, { lazy: true });
}

useAsyncExport.auto = useAutoAsync;
useAsyncExport.lazy = useLazyAsync;

export const useAsync = Object.freeze(useAsyncExport);
