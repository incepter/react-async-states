import { Source, State } from "async-states";
import { UseAsyncState } from "./types.internal";
import { useInternalAsyncState } from "./useInternalAsyncState";
import { __DEV__ } from "./shared";
import { useCallerName } from "./helpers/useCallerName";

let didWarnAboutUseSourceDeprecation = false;

export function useSource<T, E, A extends unknown[]>(
	source: Source<T, E, A>,
	lane?: string
): UseAsyncState<T, E, A, State<T, E, A>> {
	let caller;
	if (__DEV__) {
		caller = useCallerName(3);
		if (!didWarnAboutUseSourceDeprecation) {
			console.error(
				"[WARNING] - 'useSource' is deprecated. It was just a " +
					"renamed useAsyncState. please 'useAsync' instead."
			);
			didWarnAboutUseSourceDeprecation = true;
		}
	}
	return useInternalAsyncState(caller, source, [source, lane], { lane });
}
