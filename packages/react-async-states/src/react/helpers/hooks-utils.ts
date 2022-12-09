import * as React from "react";
import {StateHook, StateHookImpl} from "../StateHook";
import {UseAsyncState} from "../../types.internal";
import {__DEV__} from "../../shared";
import {emptyArray} from "../shared";

export function useCurrentHook<T, E>(caller?: string): StateHook<T, E> {
  if (__DEV__) {
    return React.useMemo<StateHook<T, E>>(
      createStateHookFromCaller.bind(null, caller), emptyArray);
  }
  return React.useMemo<StateHook<T, E>>(createStateHook, emptyArray);
}

export function createStateHookFromCaller<T, E>(caller?: string): StateHook<T, E> {
  let stateHook = new StateHookImpl<T, E>();
  stateHook.caller = caller;
  return stateHook;
}

export function createStateHook<T, E>(): StateHook<T, E> {
  return new StateHookImpl();
}

export function ensureStateHookVersionIsLatest(
  hook: StateHook<any, any>,
  selectedValue: UseAsyncState<any, any>,
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
