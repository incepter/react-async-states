import { Producer, State } from "async-states";
import { UseAsyncState } from "./types.internal";
import { useInternalAsyncState } from "./useInternalAsyncState";
import { useCallerName } from "./helpers/useCallerName";
import { __DEV__ } from "./shared";

let didWarnAboutUseProducerDeprecation = false;

export function useProducer<T, E, A extends unknown[]>(
	producer: Producer<T, E, A>
): UseAsyncState<T, E, A, State<T, E, A>> {
	let caller;
	if (__DEV__) {
		caller = useCallerName(3);
		if (!didWarnAboutUseProducerDeprecation) {
			console.error(
				"[WARNING] - 'useProducer' is deprecated. It was just a " +
					"renamed useAsyncState. please 'useAsync' instead."
			);
			didWarnAboutUseProducerDeprecation = true;
		}
	}
	let result = useInternalAsyncState(caller, producer, []);
	result.source!.replaceProducer(producer);
	return result;
}
