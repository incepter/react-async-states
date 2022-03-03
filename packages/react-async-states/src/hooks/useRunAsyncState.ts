import {AbortFn} from "../async-state";
import useAsyncStateContext from "./useAsyncStateContext";
import {AsyncStateKeyOrSource} from "../types.internal";

export function useRunAsyncState<T>(): (
  keyOrSource: AsyncStateKeyOrSource<T>,
  ...args: any[]
) => AbortFn {
  return useAsyncStateContext()?.runAsyncState;
}
