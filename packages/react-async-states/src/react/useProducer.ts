import * as React from "react";
import {Producer, State} from "../async-state";
import {StateContextValue, UseAsyncState} from "../types.internal";
import {__DEV__, noop} from "../shared";
import {useCallerName} from "./helpers/useCallerName";
import {calculateStateValue, StateHook} from "./StateHook";
import {
  ensureStateHookVersionIsLatest,
  useCurrentHook
} from "./helpers/hooks-utils";
import {AsyncStateContext} from "./context";

// this is a mini version of useAsyncState
// this hook uses fewer hooks and has fewer capabilities that useAsyncState
// its usage should be when you want to have control over a producer (may be inline)
// and you do not intend to have it auto run, dependencies, manage payload
// etc etc.
// this is like useSyncExternalStore, but returns an object with several
// functions that allows controlling the external source. So, may be better ?
// this hook can use directly useSES on the asyncState instance
// but this will require additional memoization to add the other properties
// that UseAsyncState has (abort, mergePayload, invalidateCache, run, replaceState ..)
export function useProducer<T>(
  producer: Producer<T>,
): UseAsyncState<T, State<T>> {
  let caller;
  if (__DEV__) {
    caller = useCallerName(3);
  }
  let hook: StateHook<T, State<T>> = useCurrentHook(caller);
  let contextValue = React.useContext<StateContextValue>(AsyncStateContext);

  React.useMemo(() => hook.update(3, producer, contextValue, undefined), [contextValue]);

  let [selectedValue, setSelectedValue] = React
    .useState<Readonly<UseAsyncState<T, State<T>>>>(calculateStateValue.bind(null, hook));

  ensureStateHookVersionIsLatest(hook, selectedValue, updateSelectedValue);

  if (hook.instance!.originalProducer !== producer) {
    hook.instance!.replaceProducer(producer);
  }

  React.useEffect(
    hook.subscribe.bind(null, noop, updateSelectedValue),
    [contextValue, hook.flags, hook.instance]
  );

  return selectedValue;


  function updateSelectedValue() {
    setSelectedValue(calculateStateValue(hook));
    hook.version = hook.instance?.version;
  }
}
