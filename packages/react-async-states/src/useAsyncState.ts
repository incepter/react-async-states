import * as React from "react";
import {Producer, Source, State, AsyncState,
  getOrCreatePool, isSource, readSource, nextKey,
  StateInterface} from "async-states";
import {
  BaseConfig, BaseUseAsyncState,
  CleanupFn,
  ConfigWithKeyWithoutSelector,
  ConfigWithKeyWithSelector,
  ConfigWithProducerWithoutSelector,
  ConfigWithProducerWithSelector,
  ConfigWithSourceWithoutSelector,
  ConfigWithSourceWithSelector,
  MixedConfig,
  PartialUseAsyncStateConfiguration,
  UseAsyncState,
} from "./types.internal";
import {StateContext} from "./context";
import {AUTO_RUN, CONFIG_STRING, WAIT} from "./StateHookFlags";
import {__DEV__, emptyArray, isFunction} from "./shared";
import {
  calculateStateValue, calculateSubscriptionKey, makeBaseReturn,
  resolveFlags,
  resolveInstance,
  StateHook
} from "./StateHook";
import {useCallerName} from "./helpers/useCallerName";
import {
  ensureStateHookVersionIsLatest,
  useCurrentHook
} from "./helpers/hooks-utils";
import {PoolInterface, ProducerConfig} from "async-states/src";

let is = Object.is;
let assign = Object.assign;
let hasOwnProperty = Object.prototype.hasOwnProperty;



type v2State<T, E, R, S> = {
  guard: number,
  return: UseAsyncState<T, E, R, S>,
  base: BaseUseAsyncState<T, E, R, S>,
  deps: any[],
  subscriptionKey: string | undefined,
  flags: number,
  instance: StateInterface<T, E, R> | null,
  renderInfo: {
    current: S,
    version: number | undefined,
  }
}

function resolvePool<T, E, R, S>(mixedConfig: MixedConfig<T, E, R, S>) {
  let pool = typeof mixedConfig === "object" && (mixedConfig as ProducerConfig<T, E, R>).pool;
  return getOrCreatePool(pool || "default");
}

type ActionInit<T, E, R, S> = {
  type: 0,
  deps: any[],
  caller?: string,
  config: MixedConfig<T, E, R, S>,
  overrides?: PartialUseAsyncStateConfiguration<T, E, R, S>,
}

type ActionUpdateState<T, E, R, S> = {
  type: 1,
  value: S,
}

type StateAction<T, E, R, S> = ActionInit<T, E, R, S>  | ActionUpdateState<T, E, R, S>
function stateReducer<T, E, R, S>(
  prevState:v2State<T, E, R, S> | null,
  action: StateAction<T, E, R, S>
): v2State<T, E, R, S> {
  switch (action.type) {
    case 0: { // INIT or UPDATE DEPS or UPDATE GUARD
      let {config, overrides, deps, caller} = action;


    }
    case 1: { // UPDATE STATE
      if (!prevState) {
        throw new Error("No previous state, this is a bug");
      }
      let {flags} = prevState;
      return Object.assign(prevState, {
        return: calculateStateValue(flags,)
      });
    }
  }
}

function areHookInputEqual(deps: any[], deps2: any[]) {
  if (deps.length !== deps2.length) {
    return false;
  }
  for (let i = 0, {length} = deps; i < length; i+= 1) {
    if (!is(deps[i], deps2[i])) {
      return false;
    }
  }
  return true;
}

export const useAsyncStateBase2 = function useAsyncStateImpl<T, E = any, R = any, S = State<T, E, R>>(
  config: MixedConfig<T, E, R, S>,
  deps: any[] = emptyArray,
  overrides?: PartialUseAsyncStateConfiguration<T, E, R, S>,
): UseAsyncState<T, E, R, S> {
  let caller;
  if (__DEV__) {
    caller = useCallerName(4);
  }
  let [guard, setGuard] = React.useState<number>(0);
  let [state, setState] = React.useState<v2State<T, E, R, S>>(calculateSelfState);

  if (
    state.guard !== guard ||
    !areHookInputEqual(state.deps, deps)
  ) {
    setState(calculateSelfState());
  }

  let {flags, instance, base} = state;
  if (instance && state.return.version !== instance.version) {
    setState(prev => {
      let newReturn = calculateStateValue(flags, config, base, instance);
      if (newReturn.state === prev.return.state) {
        return prev;
      }
      return Object.assign({}, prev, {return: newReturn});
    });
  }

  React.useEffect(() => {
    if (flags & WAIT) {
      let key: string = flags & CONFIG_STRING
        ? (config as string) : (config as BaseConfig<T, E, R>).key!;

      throw new Error('Not implemented yet!')
      // return hook.context!.watch(key, (maybeInstance) => {
      //   if (maybeInstance !== instance) {
      //     setGuard(old => old + 1);
      //   }
      // });
    }

  }, [flags, instance].concat(deps));
  React.useEffect(() => {}, deps);

  return state.return;

  function calculateSelfState() {
    return calculateHook(config, deps, guard, overrides, caller);
  }


}

function calculateHook<T, E, R, S>(
  config: MixedConfig<T, E, R, S>,
  deps: any[],
  guard: number,
  overrides?: PartialUseAsyncStateConfiguration<T, E, R, S>,
  caller?: string,
) {
  let newPool = resolvePool(config);
  let newFlags = resolveFlags(config, newPool, overrides);
  let newInstance = resolveInstance(newPool, newFlags, config, overrides);

  if (!newInstance && !(newFlags & WAIT)) {
    throw new Error("Undefined instance with no WAIT mode. This is a bug.");
  }

  let baseReturn = makeBaseReturn(newFlags, config, newInstance);
  let currentReturn = calculateStateValue(newFlags, config, baseReturn, newInstance);
  let subscriptionKey = calculateSubscriptionKey(newFlags, config, caller, newInstance);

  return {
    deps,
    guard,
    subscriptionKey,
    flags: newFlags,
    base: baseReturn,
    return: currentReturn,
    instance: newInstance,
    renderInfo: {
      current: currentReturn.state,
      version: currentReturn.version,
    }
  }
}

export const useAsyncStateBase = function useAsyncStateImpl<T, E = any, R = any, S = State<T, E, R>>(
  mixedConfig: MixedConfig<T, E, R, S>,
  deps: any[] = emptyArray,
  overrides?: PartialUseAsyncStateConfiguration<T, E, R, S>,
): UseAsyncState<T, E, R, S> {

  let caller;
  if (__DEV__) {
    caller = useCallerName(4);
  }
  let hook: StateHook<T, E, R, S> = useCurrentHook(caller);

  let [guard, setGuard] = React.useState<number>(0);
  let contextValue = React.useContext<StateContextValue>(StateContext);

  React.useMemo(() => hook.update(1, mixedConfig, contextValue, overrides),
    deps.concat([contextValue, guard]));

  let {flags, instance} = hook;
  let [selectedValue, setSelectedValue] = React
    .useState<Readonly<UseAsyncState<T, E, R, S>>>(() => calculateStateValue(hook));

  ensureStateHookVersionIsLatest(hook, selectedValue, updateSelectedValue);

  React.useEffect(
    hook.subscribe.bind(null, setGuard, updateSelectedValue),
    [contextValue, flags, instance]
  );

  React.useEffect(autoRunAsyncState, deps);

  return selectedValue;


  function updateSelectedValue() {
    setSelectedValue(calculateStateValue(hook));
    hook.version = instance?.version;
  }

  function autoRunAsyncState(): CleanupFn {
    let {flags, instance} = hook;
    // auto run only if condition is met, and it is not lazy
    if (!(flags & AUTO_RUN)) {
      return;
    }
    // if dependencies change, if we run, the cleanup shall abort
    let config = (hook.config as BaseConfig<T, E, R>);
    let shouldRun = true; // AUTO_RUN flag is set only if this is true

    if (isFunction(config.condition)) {
      let conditionFn = config.condition as ((state: State<T, E, R>) => boolean);
      shouldRun = conditionFn(instance!.getState());
    }

    if (shouldRun) {
      if (config.autoRunArgs && Array.isArray(config.autoRunArgs)) {
        return hook.base.run.apply(null, config.autoRunArgs);
      }
      return hook.base.run();
    }
  }
}


function useAsyncStateExport<T, E = any, R = any>(
  key: string, deps?: any[]): UseAsyncState<T, E, R>
function useAsyncStateExport<T, E = any, R = any>(
  source: Source<T, E, R>, deps?: any[]): UseAsyncState<T, E, R>
function useAsyncStateExport<T, E = any, R = any>(
  producer: Producer<T, E, R>, deps?: any[]): UseAsyncState<T, E, R>
function useAsyncStateExport<T, E = any, R = any, S = State<T, E, R>>(
  configWithKeyWithSelector: ConfigWithKeyWithSelector<T, E, R, S>,
  deps?: any[]
): UseAsyncState<T, E, R, S>
function useAsyncStateExport<T, E = any, R = any>(
  configWithKeyWithoutSelector: ConfigWithKeyWithoutSelector<T, E, R>,
  deps?: any[]
): UseAsyncState<T, E, R>
function useAsyncStateExport<T, E = any, R = any, S = State<T, E, R>>(
  configWithSourceWithSelector: ConfigWithSourceWithSelector<T, E, R, S>,
  deps?: any[]
): UseAsyncState<T, E, R, S>
function useAsyncStateExport<T, E = any, R = any>(
  configWithSourceWithoutSelector: ConfigWithSourceWithoutSelector<T, E, R>,
  deps?: any[]
): UseAsyncState<T, E, R>
function useAsyncStateExport<T, E = any, R = any, S = State<T, E, R>>(
  configWithProducerWithSelector: ConfigWithProducerWithSelector<T, E, R, S>,
  deps?: any[]
): UseAsyncState<T, E, R, S>
function useAsyncStateExport<T, E = any, R = any>(
  configWithProducerWithoutSelector: ConfigWithProducerWithoutSelector<T, E, R>,
  deps?: any[]
): UseAsyncState<T, E, R>
function useAsyncStateExport<T, E = any, R = any, S = State<T, E, R>>(
  mixedConfig: MixedConfig<T, E, R, S>, deps?: any[]): UseAsyncState<T, E, R, S>
function useAsyncStateExport<T, E, R, S = State<T, E, R>>(
  mixedConfig: MixedConfig<T, E, R, S>,
  deps?: any[]
): UseAsyncState<T, E, R, S> {
  return useAsyncStateBase(mixedConfig, deps);
}

function useAutoAsyncState<T, E = any, R = any, S = State<T, E, R>>(
  subscriptionConfig: MixedConfig<T, E, R, S>,
  dependencies?: any[]
): UseAsyncState<T, E, R, S> {
  return useAsyncStateBase(
    subscriptionConfig,
    dependencies,
    {lazy: false}
  );
}

function useLazyAsyncState<T, E = any, R = any, S = State<T, E, R>>(
  subscriptionConfig: MixedConfig<T, E, R, S>,
  dependencies?: any[]
): UseAsyncState<T, E, R, S> {
  return useAsyncStateBase(
    subscriptionConfig,
    dependencies,
    {lazy: true}
  );
}

function useForkAsyncState<T, E = any, R = any, S = State<T, E, R>>(
  subscriptionConfig: MixedConfig<T, E, R, S>,
  dependencies?: any[]
): UseAsyncState<T, E, R, S> {
  return useAsyncStateBase(
    subscriptionConfig,
    dependencies,
    {fork: true}
  );
}


function useForkAutoAsyncState<T, E = any, R = any, S = State<T, E, R>>(
  subscriptionConfig: MixedConfig<T, E, R, S>,
  dependencies?: any[]
): UseAsyncState<T, E, R, S> {
  return useAsyncStateBase(
    subscriptionConfig,
    dependencies,
    {fork: true, lazy: false}
  );
}

function useHoistAsyncState<T, E = any, R = any, S = State<T, E, R>>(
  subscriptionConfig: MixedConfig<T, E, R, S>,
  dependencies?: any[]
): UseAsyncState<T, E, R, S> {
  return useAsyncStateBase(
    subscriptionConfig,
    dependencies,
    {hoist: true}
  );
}

function useHoistAutoAsyncState<T, E = any, R = any, S = State<T, E, R>>(
  subscriptionConfig: MixedConfig<T, E, R, S>,
  dependencies?: any[]
): UseAsyncState<T, E, R, S> {
  return useAsyncStateBase(
    subscriptionConfig,
    dependencies,
    {hoist: true, lazy: false}
  );
}

useAsyncStateExport.auto = useAutoAsyncState;
useAsyncStateExport.lazy = useLazyAsyncState;
useAsyncStateExport.fork = useForkAsyncState;
useAsyncStateExport.hoist = useHoistAsyncState;
useAsyncStateExport.forkAuto = useForkAutoAsyncState;
useAsyncStateExport.hoistAuto = useHoistAutoAsyncState;

export const useAsyncState = Object.freeze(useAsyncStateExport);
