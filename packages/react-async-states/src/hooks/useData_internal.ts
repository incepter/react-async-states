// missing point:
// initial return may have data as null (in a typing point of view)
// this point will be challenging to be addressed, it should be typed deep down
// to the Source itself and the StateInterface. which may be impossible
// think about that later. a data: null may be okay for now.
import { MixedConfig, ModernHookReturn, PartialUseAsyncConfig } from "./types";
import { __DEV__ } from "../shared";
import { __DEV__setHookCallerName } from "./modules/HookSubscription";
import { useCallerName } from "../helpers/useCallerName";
import { useAsync_internal } from "./useAsync_internal";

export function useData_internal<T, A extends unknown[], E, S>(
	options: MixedConfig<T, A, E, S>,
	deps: unknown[],
	overrides?: PartialUseAsyncConfig<T, A, E, S> | null
): ModernHookReturn<T, A, E, S> {
	if (__DEV__) {
		__DEV__setHookCallerName(useCallerName(4));
	}
	// this will mimic useAsync and get its result
	let result = useAsync_internal(options, deps, overrides);

	// read(true, true) means that it will suspend when the status is pending
	// and that it will throw the error when the status is error
	result.read(true, true);

	// the result here is guaranteed to be either initial or success
	return result as ModernHookReturn<T, A, E, S>;
}
