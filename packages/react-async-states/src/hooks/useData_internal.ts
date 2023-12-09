import {
	MixedConfig,
	ModernHookReturn,
	PartialUseAsyncStateConfiguration,
} from "./types";
import { useAsync_internal } from "./useAsync_internal";

// experimental unfinished hook
// will be flushed later
export function useData_internal<T, A extends unknown[], E, S>(
	options: MixedConfig<T, A, E, S>,
	deps: unknown[],
	overrides?: PartialUseAsyncStateConfiguration<T, A, E, S> | null
): [
	ModernHookReturn<T, A, E, S>["data"],
	ModernHookReturn<T, A, E, S>["source"]
] {
	let legacyReturn = useAsync_internal(options, deps, overrides);

	// the goal of this hook is to keep the same useAsync signature
	// and only give initial or success states, it will throw
	legacyReturn.read(true, true);

	if (legacyReturn.isPending || legacyReturn.isError) {
		throw new Error("Illegal state, useData cannot be pending or error");
	}

	return [legacyReturn.data, legacyReturn.source];
}
