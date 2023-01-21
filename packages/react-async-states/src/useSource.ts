import {Source, State} from "async-states";
import {UseAsyncState} from "./types.internal";
import {useInternalAsyncState} from "./useInternalAsyncState";
import {__DEV__} from "./shared";
import {useCallerName} from "./helpers/useCallerName";

export function useSource<T, E, R>(
  source: Source<T, E, R>,
  lane?: string,
): UseAsyncState<T, E, R, State<T, E, R>> {
  let caller;
  if (__DEV__) {
    caller = useCallerName(4);
  }
  return useInternalAsyncState(caller, source, [source, lane], {lane});
}
