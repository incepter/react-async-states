import * as React from "react";
import {StateHook, StateHookImpl} from "../StateHook";
import {UseAsyncState} from "../types.internal";
import {__DEV__, emptyArray} from "../shared";

export function useCurrentHook<T, E, R, S>(caller?: string): StateHook<T, E, R, S> {
  if (__DEV__) {
    return React.useMemo<StateHook<T, E, R, S>>(
      createStateHookFromCaller.bind(null, caller), emptyArray);
  }
  return React.useMemo<StateHook<T, E, R, S>>(createStateHook, emptyArray);
}

export function createStateHookFromCaller<T, E, R, S>(caller?: string): StateHook<T, E, R, S> {
  let stateHook = new StateHookImpl<T, E, R, S>();
  stateHook.caller = caller;
  return stateHook;
}

export function createStateHook<T, E, R, S>(): StateHook<T, E, R, S> {
  return new StateHookImpl();
}

export function ensureStateHookVersionIsLatest(
  hook: StateHook<any, any, any, any>,
  selectedValue: UseAsyncState<any, any, any, any>,
  onMismatch: () => void,
) {
  if (
    selectedValue.version !== hook.instance?.version ||
    selectedValue.source !== hook.instance?._source
  ) {
    onMismatch();
  }

  if (hook.current !== selectedValue.state) {
    hook.current = selectedValue.state;
  }
  if (hook.version !== selectedValue.version) {
    hook.version = selectedValue.version;
  }

}
