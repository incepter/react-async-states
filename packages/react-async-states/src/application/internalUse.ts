import { Source, Status, SuccessState } from "async-states";
import { UseConfig } from "../types.internal";
import { __DEV__, emptyArray } from "../shared";
import { useCallerName } from "../helpers/useCallerName";
import { useAsync_internal } from "../hooks/useAsync";
import { __DEV__setHookCallerName } from "../hooks/modules/HookSubscription";

export default function internalUse<T, E, A extends unknown[]>(
	source: Source<T, E, A>,
	options?: UseConfig<T, E, A>,
	deps: any[] = emptyArray
): T {
	if (__DEV__) {
		__DEV__setHookCallerName(useCallerName(5));
	}
	let config = options ? { ...options, source } : source;
	let { read, state, lastSuccess } = useAsync_internal(config, deps);
	read(true, true); // suspends only when initial, throws E in Error

	return (lastSuccess as SuccessState<T, any>)!.data;
}
