import {Producer, State} from "async-states";
import {UseAsyncState} from "./types.internal";
import {useInternalAsyncState} from "./useInternalAsyncState";

export function useProducer<T, E, R>(
  producer: Producer<T, E, R>,
): UseAsyncState<T, E, R, State<T, E, R>> {
  let result = useInternalAsyncState(3, 4, producer, []);
  result.source!.replaceProducer(producer);
  return result;
}
