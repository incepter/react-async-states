import * as React from "react";
import {
  hookReturn,
  createHook,
  HookOwnState,
  autoRun
} from "async-states";
import {
  MixedConfig,
  PartialUseAsyncStateConfiguration,
  UseAsyncState,
} from "./types.internal";
import {emptyArray} from "./shared";
import {useExecutionContext} from "./hydration/context";
import {State} from "async-states";

export const useInternalAsyncState = function useAsyncStateImpl<T, E, R, A extends unknown[], S = State<T, E, R, A>>(
  callerName: string | undefined,
  mixedConfig: MixedConfig<T, E, R, A, S>,
  deps: any[] = emptyArray,
  overrides?: PartialUseAsyncStateConfiguration<T, E, R, A, S>,
): UseAsyncState<T, E, R, A, S> {
  // the current library's execution context
  let execContext = useExecutionContext();
  // used when waiting for a state to exist, this will trigger a recalculation
  let [guard, setGuard] = React.useState<number>(0);
  // this contains everything else, from the dependencies to configuration
  // to internal variables used by the library
  let [hook, setHook] = React.useState<HookOwnState<T, E, R, A, S>>(createOwnHook);
  // the reference towards this "hook" object changes every state update
  // to ensure a certain isolation and that react would actually react to it
  // so no logic should depend on the "hook" object itself, but to what it holds
  let {flags, context, instance, base, renderInfo, config} = hook;
  React.useEffect(
    () => hook.subscribeEffect(updateReturnState, setGuard),
    [renderInfo, flags, instance].concat(deps)
  );
  React.useEffect(() => autoRun(hook), deps);

  renderInfo.version = instance?.version;
  renderInfo.current = hook.return.state;
  if (hook.guard !== guard || context !== execContext || didDepsChange(hook.deps, deps)) {
    setHook(createOwnHook());
  }
  if (instance && hook.return.version !== instance.version) {
    updateReturnState();
  }
  return hook.return;

  function updateReturnState() {
    setHook(prev => {
      let newReturn = hookReturn(flags, config, base, instance);
      return Object.assign({}, prev, {return: newReturn});
    });
  }

  function createOwnHook(): HookOwnState<T, E, R, A, S> {
    return createHook(execContext, mixedConfig, deps, guard, overrides, callerName);
  }
}

export function didDepsChange(deps: any[], deps2: any[]) {
  if (deps.length !== deps2.length) {
    return true;
  }
  for (let i = 0, {length} = deps; i < length; i += 1) {
    if (!Object.is(deps[i], deps2[i])) {
      return true;
    }
  }
  return false;
}
