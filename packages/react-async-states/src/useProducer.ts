import {Producer, State} from "async-states";
import {UseAsyncState} from "./types.internal";
import {useInternalAsyncState} from "./useInternalAsyncState";
import {useCallerName} from "./helpers/useCallerName";
import {__DEV__} from "./shared";

export function useProducer<T, E, R>(
  producer: Producer<T, E, R>,
): UseAsyncState<T, E, R, State<T, E, R>> {

  let caller;
  if (__DEV__) {
    caller = useCallerName(3);
  }
  let result = useInternalAsyncState(caller, producer, []);
  result.source!.replaceProducer(producer);
  return result;
}
