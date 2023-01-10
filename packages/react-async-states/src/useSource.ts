import {Source, State} from "async-states";
import {UseAsyncState} from "./types.internal";
import {useInternalAsyncState} from "./useInternalAsyncState";

export function useSource<T, E, R>(
  source: Source<T, E, R>,
  lane?: string,
): UseAsyncState<T, E, R, State<T, E, R>> {

  return useInternalAsyncState(
    2,
    4,
    source,
    [source, lane],
    {lane}
  );
}
