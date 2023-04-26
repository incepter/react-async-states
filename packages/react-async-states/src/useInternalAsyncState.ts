import * as React from "react";
import {State} from "async-states";
import {
  MixedConfig,
  PartialUseAsyncStateConfiguration,
  UseAsyncState,
} from "./types.internal";
import {didDepsChange, emptyArray} from "./shared";
import {useExecutionContext} from "./hydration/context";
import {
  autoRun,
  createHook,
  HookOwnState,
  hookReturn
} from "./state-hook/StateHook";
import {CONCURRENT} from "./state-hook/StateHookFlags";

function getContextFromMixedConfig(mixedConfig) {
  if (typeof mixedConfig !== "object") {
    return undefined
  }
  return mixedConfig.context
}

export const useInternalAsyncState = function useAsyncStateImpl<T, E, R, A extends unknown[], S = State<T, E, R, A>>(
  callerName: string | undefined,
  mixedConfig: MixedConfig<T, E, R, A, S>,
  deps: any[] = emptyArray,
  overrides?: PartialUseAsyncStateConfiguration<T, E, R, A, S>,
): UseAsyncState<T, E, R, A, S> {
  // the current library's execution context
  let execContext = useExecutionContext(getContextFromMixedConfig(mixedConfig));
  // used when waiting for a state to exist, this will trigger a recalculation
  let [guard, setGuard] = React.useState<number>(0);
  // this contains everything else, from the dependencies to configuration
  // to internal variables used by the library
  let [hook, setHook] = React.useState<HookOwnState<T, E, R, A, S>>(createOwnHook);
  // the reference towards this "hook" object changes every state update
  // to ensure a certain isolation and that react would actually react to it
  // so no logic should depend on the "hook" object itself, but to what it holds
  let {flags, context, instance, base, renderInfo, config} = hook;

  // performs subscription and events firing
  React.useEffect(
    () => hook.subscribeEffect(updateReturnState, setGuard),
    [renderInfo, flags, instance].concat(deps)
  );
  // will auto run if necessary
  React.useEffect(() => autoRun(flags, instance?._source, config), deps);

  //
  renderInfo.version = instance?.version;
  renderInfo.current = hook.return.state;

  if (hook.guard !== guard || context !== execContext || didDepsChange(hook.deps, deps)) {
    setHook(createOwnHook());
  }

  // optimistic lock to never tear and stay up to date
  if (instance && hook.return.version !== instance.version) {
    updateReturnState();
  }

  if (flags & CONCURRENT) {
    // both: when status is initial and pending, it will throw a promise
    // false: don't throw to error boundary in case of problems
    hook.return.read("both", false);
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
