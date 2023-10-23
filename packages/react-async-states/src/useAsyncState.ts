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
	A extends unknown[] = unknown[],
	S = State<T, E, A>
>(
	mixedConfig: MixedConfig<T, E, A, S>,
	deps: any[] = emptyArray,
	overrides?: PartialUseAsyncStateConfiguration<T, E, A, S>
): UseAsyncState<T, E, A, S> {
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

function useAsyncStateExport<T, E = unknown, A extends unknown[] = unknown[]>(
	key: string,
	deps?: any[]
): UseAsyncState<T, E, A>;
function useAsyncStateExport<T, E = unknown, A extends unknown[] = unknown[]>(
	source: Source<T, E, A>,
	deps?: any[]
): UseAsyncState<T, E, A>;
function useAsyncStateExport<T, E = unknown, A extends unknown[] = unknown[]>(
	producer: Producer<T, E, A>,
	deps?: any[]
): UseAsyncState<T, E, A>;
function useAsyncStateExport<
	T,
	E = unknown,
	A extends unknown[] = unknown[],
	S = State<T, E, A>
>(
	configWithKeyWithSelector: ConfigWithKeyWithSelector<T, E, A, S>,
	deps?: any[]
): UseAsyncState<T, E, A, S>;
function useAsyncStateExport<T, E = unknown, A extends unknown[] = unknown[]>(
	configWithKeyWithoutSelector: ConfigWithKeyWithoutSelector<T, E, A>,
	deps?: any[]
): UseAsyncState<T, E, A>;
function useAsyncStateExport<
	T,
	E = unknown,
	A extends unknown[] = unknown[],
	S = State<T, E, A>
>(
	configWithSourceWithSelector: ConfigWithSourceWithSelector<T, E, A, S>,
	deps?: any[]
): UseAsyncState<T, E, A, S>;
function useAsyncStateExport<T, E = unknown, A extends unknown[] = unknown[]>(
	configWithSourceWithoutSelector: ConfigWithSourceWithoutSelector<T, E, A>,
	deps?: any[]
): UseAsyncState<T, E, A>;
function useAsyncStateExport<
	T,
	E = unknown,
	A extends unknown[] = unknown[],
	S = State<T, E, A>
>(
	configWithProducerWithSelector: ConfigWithProducerWithSelector<T, E, A, S>,
	deps?: any[]
): UseAsyncState<T, E, A, S>;
function useAsyncStateExport<T, E = unknown, A extends unknown[] = unknown[]>(
	configWithProducerWithoutSelector: ConfigWithProducerWithoutSelector<T, E, A>,
	deps?: any[]
): UseAsyncState<T, E, A>;
function useAsyncStateExport<
	T,
	E = unknown,
	A extends unknown[] = unknown[],
	S = State<T, E, A>
>(
	mixedConfig: MixedConfig<T, E, A, S>,
	deps?: any[]
): UseAsyncState<T, E, A, S>;
function useAsyncStateExport<T, E, A extends unknown[], S = State<T, E, A>>(
	mixedConfig: MixedConfig<T, E, A, S>,
	deps?: any[]
): UseAsyncState<T, E, A, S> {
	return useAsyncStateBase(mixedConfig, deps);
}

function useAutoAsyncState<
	T,
	E = unknown,
	A extends unknown[] = unknown[],
	S = State<T, E, A>
>(
	subscriptionConfig: MixedConfig<T, E, A, S>,
	dependencies?: any[]
): UseAsyncState<T, E, A, S> {
	return useAsyncStateBase(subscriptionConfig, dependencies, { lazy: false });
}

function useLazyAsyncState<
	T,
	E = unknown,
	A extends unknown[] = unknown[],
	S = State<T, E, A>
>(
	subscriptionConfig: MixedConfig<T, E, A, S>,
	dependencies?: any[]
): UseAsyncState<T, E, A, S> {
	return useAsyncStateBase(subscriptionConfig, dependencies, { lazy: true });
}

useAsyncStateExport.auto = useAutoAsyncState;
useAsyncStateExport.lazy = useLazyAsyncState;

export const useAsyncState = Object.freeze(useAsyncStateExport);
