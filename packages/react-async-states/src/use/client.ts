import * as React from "react";
import {__DEV__, didDepsChange, emptyArray} from "../shared";
import {useCallerName} from "../helpers/useCallerName";
import {useInternalAsyncState} from "../useInternalAsyncState";
import {ProducerProps, Status, SuccessState} from "async-states";
import {CreateType} from "../types.internal";

let rendersIndex = 0

export function useInClient<T, E>(
  id: string,
  create: CreateType<T, E>,
  deps: any[] = emptyArray,
  options
): T {
  if (rendersIndex === 10) {
    throw new Error('aw aw')
  }
  rendersIndex += 1
  let caller;
  if (__DEV__) {
    caller = useCallerName(5);
  }

  let {key, read, source, state, lastSuccess} = useInternalAsyncState<
    T, E, never, [() => (T | Promise<T>), any[]]
  >(
    caller,
    {key: id, ...options, producer: producerForUseInClient},
    deps
  )

  let prevInput2s = lastSuccess?.props?.args
  console.log('using in client', key, deps, state, prevInput2s, didDepsChange(deps, prevInput2s?.[1] || []))

  if (state.status === Status.initial) {
    throw source!.runp(create, deps)
  }
  read() // suspends on pending, throws E in error

  // if just hydrated, or did succeed, the prevInputs[1] will here there.
  let prevInputs = lastSuccess?.props?.args
  if (didDepsChange(deps, prevInputs?.[1] || emptyArray)) {
    throw source!.runp(create, deps)
  }

  if (state.status === Status.aborted) {
    throw state.data
  }

  return (lastSuccess as SuccessState<T, any>)!.data
}


function producerForUseInClient<T, E>(props: ProducerProps<T, E, never, [() => (T | Promise<T>), any[]]>) {
  return props.args[0]()
}
