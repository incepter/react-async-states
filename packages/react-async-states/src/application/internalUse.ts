import { Source } from "async-states";
import { UseConfig } from "../types.internal";
import { __DEV__, emptyArray } from "../shared";
import { useCallerName } from "../helpers/useCallerName";
import { useAsync_internal } from "../hooks/useAsync_internal";
import { __DEV__setHookCallerName } from "../hooks/modules/HookSubscription";

export default function internalUse<TData, TArgs extends unknown[], TError>(
  source: Source<TData, TArgs, TError>,
  options?: UseConfig<TData, TArgs, TError>,
  deps: any[] = emptyArray
): TData {
  if (__DEV__) {
    __DEV__setHookCallerName(useCallerName(3));
  }
  let config = options ? { ...options, source } : source;
  let { read, data } = useAsync_internal(config, deps);
  read(true, true); // suspends only when initial, throws E in Error

  return data!;
}
