import {Source, Status, SuccessState} from "async-states";
import {UseConfig} from "../types.internal";
import {__DEV__, emptyArray} from "../shared";
import {useCallerName} from "../helpers/useCallerName";
import {useInternalAsyncState} from "../useInternalAsyncState";

export default function use<T, E, R, A extends unknown[]>(
  source: Source<T, E, R, A>,
  options?: UseConfig<T, E, R, A>,
  deps: any[] = emptyArray,
) {
  let caller;
  if (__DEV__) {
    caller = useCallerName(5);
  }

  let {read, state, lastSuccess} = useInternalAsyncState(caller, {...options, source}, deps);

  if (state.status === Status.initial) {
    if (!options?.autoRunArgs) {
      // @ts-ignore
      throw source.runp()
    }
    throw source.runp(...options.autoRunArgs)
  }
  read() // suspends on pending, throws E in error
  if (state.status === Status.aborted) {
    throw state.data
  }
  return (lastSuccess as SuccessState<T, any>)!.data
}
