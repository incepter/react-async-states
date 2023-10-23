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

let didWarnAboutUseAsyncStateDeprecation = false;
export const useAsyncStateBase = function useAsyncStateImpl<
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
		if (!didWarnAboutUseAsyncStateDeprecation) {
			console.error(
				"useAsyncState()  has been renamed to 'useAsync'. " +
					"Please replace all usages. It should be just a replace in all files."
			);
			didWarnAboutUseAsyncStateDeprecation = true;
		}
	}
	return useInternalAsyncState(caller, mixedConfig, deps, overrides);
};

function useAsyncStateExport<
	T,
	E = unknown,
	R = unknown,
	A extends unknown[] = unknown[]
>(key: string, deps?: any[]): UseAsyncState<T, E, R, A>;
function useAsyncStateExport<
	T,
	E = unknown,
	R = unknown,
	A extends unknown[] = unknown[]
>(source: Source<T, E, R, A>, deps?: any[]): UseAsyncState<T, E, R, A>;
function useAsyncStateExport<
	T,
	E = unknown,
	R = unknown,
	A extends unknown[] = unknown[]
>(producer: Producer<T, E, R, A>, deps?: any[]): UseAsyncState<T, E, R, A>;
function useAsyncStateExport<
	T,
	E = unknown,
	R = unknown,
	A extends unknown[] = unknown[],
	S = State<T, E, R, A>
>(
	configWithKeyWithSelector: ConfigWithKeyWithSelector<T, E, R, A, S>,
	deps?: any[]
): UseAsyncState<T, E, R, A, S>;
function useAsyncStateExport<
	T,
	E = unknown,
	R = unknown,
	A extends unknown[] = unknown[]
>(
	configWithKeyWithoutSelector: ConfigWithKeyWithoutSelector<T, E, R, A>,
	deps?: any[]
): UseAsyncState<T, E, R, A>;
function useAsyncStateExport<
	T,
	E = unknown,
	R = unknown,
	A extends unknown[] = unknown[],
	S = State<T, E, R, A>
>(
	configWithSourceWithSelector: ConfigWithSourceWithSelector<T, E, R, A, S>,
	deps?: any[]
): UseAsyncState<T, E, R, A, S>;
function useAsyncStateExport<
	T,
	E = unknown,
	R = unknown,
	A extends unknown[] = unknown[]
>(
	configWithSourceWithoutSelector: ConfigWithSourceWithoutSelector<T, E, R, A>,
	deps?: any[]
): UseAsyncState<T, E, R, A>;
function useAsyncStateExport<
	T,
	E = unknown,
	R = unknown,
	A extends unknown[] = unknown[],
	S = State<T, E, R, A>
>(
	configWithProducerWithSelector: ConfigWithProducerWithSelector<T, E, R, A, S>,
	deps?: any[]
): UseAsyncState<T, E, R, A, S>;
function useAsyncStateExport<
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
function useAsyncStateExport<
	T,
	E = unknown,
	R = unknown,
	A extends unknown[] = unknown[],
	S = State<T, E, R, A>
>(
	mixedConfig: MixedConfig<T, E, R, A, S>,
	deps?: any[]
): UseAsyncState<T, E, R, A, S>;
function useAsyncStateExport<
	T,
	E,
	R,
	A extends unknown[],
	S = State<T, E, R, A>
>(
	mixedConfig: MixedConfig<T, E, R, A, S>,
	deps?: any[]
): UseAsyncState<T, E, R, A, S> {
	return useAsyncStateBase(mixedConfig, deps);
}

function useAutoAsyncState<
	T,
	E = unknown,
	R = unknown,
	A extends unknown[] = unknown[],
	S = State<T, E, R, A>
>(
	subscriptionConfig: MixedConfig<T, E, R, A, S>,
	dependencies?: any[]
): UseAsyncState<T, E, R, A, S> {
	return useAsyncStateBase(subscriptionConfig, dependencies, { lazy: false });
}

function useLazyAsyncState<
	T,
	E = unknown,
	R = unknown,
	A extends unknown[] = unknown[],
	S = State<T, E, R, A>
>(
	subscriptionConfig: MixedConfig<T, E, R, A, S>,
	dependencies?: any[]
): UseAsyncState<T, E, R, A, S> {
	return useAsyncStateBase(subscriptionConfig, dependencies, { lazy: true });
}


useAsyncStateExport.auto = useAutoAsyncState;
useAsyncStateExport.lazy = useLazyAsyncState;

export const useAsyncState = Object.freeze(useAsyncStateExport);
