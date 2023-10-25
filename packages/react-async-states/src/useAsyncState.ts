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
} from "./hooks/types";
import { __DEV__, emptyArray } from "./shared";
import { useCallerName } from "./helpers/useCallerName";
import { __DEV__setHookCallerName } from "./hooks/modules/HookSubscription";
import { useAsync_internal } from "./hooks/useAsync";
import { LegacyHookReturn } from "./hooks/types";

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
): LegacyHookReturn<T, E, A, S> {
	if (__DEV__) {
		__DEV__setHookCallerName(useCallerName(4));
		if (!didWarnAboutUseAsyncStateDeprecation) {
			console.error(
				"useAsyncState()  has been renamed to 'useAsync'. " +
					"Please replace all usages. It should be just a replace in all files."
			);
			didWarnAboutUseAsyncStateDeprecation = true;
		}
	}
	return useAsync_internal(mixedConfig, deps, overrides);
};

function useAsyncStateExport<T, E = unknown, A extends unknown[] = unknown[]>(
	key: string,
	deps?: any[]
): LegacyHookReturn<T, E, A>;
function useAsyncStateExport<T, E = unknown, A extends unknown[] = unknown[]>(
	source: Source<T, E, A>,
	deps?: any[]
): LegacyHookReturn<T, E, A>;
function useAsyncStateExport<T, E = unknown, A extends unknown[] = unknown[]>(
	producer: Producer<T, E, A>,
	deps?: any[]
): LegacyHookReturn<T, E, A>;
function useAsyncStateExport<
	T,
	E = unknown,
	A extends unknown[] = unknown[],
	S = State<T, E, A>
>(
	configWithKeyWithSelector: ConfigWithKeyWithSelector<T, E, A, S>,
	deps?: any[]
): LegacyHookReturn<T, E, A, S>;
function useAsyncStateExport<T, E = unknown, A extends unknown[] = unknown[]>(
	configWithKeyWithoutSelector: ConfigWithKeyWithoutSelector<T, E, A>,
	deps?: any[]
): LegacyHookReturn<T, E, A>;
function useAsyncStateExport<
	T,
	E = unknown,
	A extends unknown[] = unknown[],
	S = State<T, E, A>
>(
	configWithSourceWithSelector: ConfigWithSourceWithSelector<T, E, A, S>,
	deps?: any[]
): LegacyHookReturn<T, E, A, S>;
function useAsyncStateExport<T, E = unknown, A extends unknown[] = unknown[]>(
	configWithSourceWithoutSelector: ConfigWithSourceWithoutSelector<T, E, A>,
	deps?: any[]
): LegacyHookReturn<T, E, A>;
function useAsyncStateExport<
	T,
	E = unknown,
	A extends unknown[] = unknown[],
	S = State<T, E, A>
>(
	configWithProducerWithSelector: ConfigWithProducerWithSelector<T, E, A, S>,
	deps?: any[]
): LegacyHookReturn<T, E, A, S>;
function useAsyncStateExport<T, E = unknown, A extends unknown[] = unknown[]>(
	configWithProducerWithoutSelector: ConfigWithProducerWithoutSelector<T, E, A>,
	deps?: any[]
): LegacyHookReturn<T, E, A>;
function useAsyncStateExport<
	T,
	E = unknown,
	A extends unknown[] = unknown[],
	S = State<T, E, A>
>(
	mixedConfig: MixedConfig<T, E, A, S>,
	deps?: any[]
): LegacyHookReturn<T, E, A, S>;
function useAsyncStateExport<T, E, A extends unknown[], S = State<T, E, A>>(
	mixedConfig: MixedConfig<T, E, A, S>,
	deps?: any[]
): LegacyHookReturn<T, E, A, S> {
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
): LegacyHookReturn<T, E, A, S> {
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
): LegacyHookReturn<T, E, A, S> {
	return useAsyncStateBase(subscriptionConfig, dependencies, { lazy: true });
}

useAsyncStateExport.auto = useAutoAsyncState;
useAsyncStateExport.lazy = useLazyAsyncState;

export const useAsyncState = Object.freeze(useAsyncStateExport);
