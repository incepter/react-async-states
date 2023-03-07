import {Source, State} from "async-states";
import {UseAsyncState} from "./types.internal";
import {useInternalAsyncState} from "./useInternalAsyncState";
import {__DEV__} from "./shared";
import {useCallerName} from "./helpers/useCallerName";

export function useSource<T, E, R, A extends unknown[]>(
  source: Source<T, E, R, A>,
  lane?: string,
): UseAsyncState<T, E, R, A, State<T, E, R, A>> {
  let caller;
  if (__DEV__) {
    caller = useCallerName(3);
  }
  return useInternalAsyncState(caller, source, [source, lane], {lane});
}
