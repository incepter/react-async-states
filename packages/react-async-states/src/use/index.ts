import {Source, Status, SuccessState} from "async-states";
import {UseConfig} from "../types.internal";
import {__DEV__, emptyArray} from "../shared";
import {useCallerName} from "../helpers/useCallerName";
import {useInternalAsyncState} from "../useInternalAsyncState";

export default function use<T, E, R, A extends unknown[]>(
  source: Source<T, E, R, A>,
  options?: UseConfig<T, E, R, A>,
  deps: any[] = emptyArray,
): T {
  let caller;
  if (__DEV__) {
    caller = useCallerName(5);
  }

  let config = options ? {...options, source} : source
  let {read, state, lastSuccess} = useInternalAsyncState(caller, config, deps);
  read("initial", true) // suspends only when initial, throws E in Error
  if (state.status === Status.aborted) {
    throw state
  }

  return (lastSuccess as SuccessState<T, any>)!.data
}
