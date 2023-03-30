import * as React from "react";
import {__DEV__, emptyArray} from "../shared";
import {useCallerName} from "../helpers/useCallerName";
import {useInternalAsyncState} from "../useInternalAsyncState";
import {ProducerProps, Status, SuccessState} from "async-states";
import {CreateType} from "../types.internal";

export function useInServer<T, E>(
  id: string,
  create: CreateType<T, E>,
  deps: any[] = emptyArray
): T {
  let caller;
  if (__DEV__) {
    caller = useCallerName(5);
  }
  let {read, source, state, lastSuccess} = useInternalAsyncState<
    T, E, never, [() => (T | Promise<T>), any[]]
  >(caller, {
    key:  id,
    producer: producerForUseInServer
  }, deps)
  if (state.status === Status.initial) {
    throw source!.runp(create, deps)
  }
  read() // suspends on pending, throws E in error
  if (state.status === Status.aborted) {
    throw state.data
  }
  return (lastSuccess as SuccessState<T, any>)!.data
}

function producerForUseInServer<T, E>(props: ProducerProps<T, E, never, [() => (T | Promise<T>), any[]]>) {
  return props.args[0]()
}
