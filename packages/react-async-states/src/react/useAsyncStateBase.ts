import * as React from "react";
import AsyncState, {
  AbortFn,
  AsyncStateStatus,
  Producer,
  Source,
  State,
  StateInterface
} from "../async-state";
import {
  BaseConfig,
  BaseUseAsyncState,
  CleanupFn,
  MixedConfig,
  PartialUseAsyncStateConfiguration,
  StateContextValue,
  SubscribeEventProps,
  UseAsyncState,
  UseAsyncStateEventFn,
  UseAsyncStateEvents,
  UseAsyncStateEventSubscribe,
} from "../types.internal";
import {AsyncStateContext} from "./context";
import {isSource} from "../async-state/utils";
import {
  readSource,
  standaloneProducerEffectsCreator
} from "../async-state/AsyncState";
import {
  AUTO_RUN,
  CHANGE_EVENTS,
  CONFIG_FUNCTION,
  CONFIG_OBJECT,
  CONFIG_SOURCE,
  CONFIG_STRING,
  EQUALITY_CHECK,
  FORK,
  HOIST,
  INSIDE_PROVIDER,
  LANE,
  NO_MODE,
  SELECTOR,
  SOURCE,
  STANDALONE,
  SUBSCRIBE_EVENTS,
  WAIT
} from "./StateHookFlags";
import {nextKey} from "../async-state/key-gen";
import {__DEV__, shallowClone} from "../shared";
import {
  computeCallerName,
} from "./helpers/useCallerName";
import {supportsConcurrentMode} from "./helpers/supports-concurrent-mode";
import {humanizeDevFlags} from "./utils";

const emptyArray = [];

export const useAsyncStateBase = function useAsyncStateImpl<T, E = State<T>>(
  mixedConfig: MixedConfig<T, E>,
  deps: any[] = emptyArray,
  overrides?: PartialUseAsyncStateConfiguration<T, E>,
): UseAsyncState<T, E> {

  const hook: StateHook<T, E> = useCurrentHook();
  const [guard, setGuard] = React.useState<number>(0);
  const contextValue = React.useContext<StateContextValue>(AsyncStateContext);

  React.useMemo(() => hook.update(1, mixedConfig, contextValue, overrides),
    [contextValue, guard, ...deps]);

  const [selectedValue, setSelectedValue] = React
    .useState<Readonly<UseAsyncState<T, E>>>(calculateStateValue.bind(null, hook));

  if (
    selectedValue.version !== hook.instance?.version ||
    selectedValue.source !== hook.instance?._source
  ) {
    updateSelectedValue();
  }

  if (hook.current !== selectedValue.state) {
    hook.current = selectedValue.state;
  }
  if (hook.version !== selectedValue.version) {
    hook.version = selectedValue.version;
  }

  React.useEffect(
    hook.subscribe.bind(null, setGuard, updateSelectedValue),
    [contextValue, hook.flags, hook.instance]
  );

  React.useEffect(autoRunAsyncState, deps);

  return selectedValue;


  function updateSelectedValue() {
    setSelectedValue(calculateStateValue(hook));
    hook.version = hook.instance?.version;
  }
  function autoRunAsyncState(): CleanupFn {
    // auto run only if condition is met, and it is not lazy
    if (!(hook.flags & AUTO_RUN)) {
      return;
    }
    // if dependencies change, if we run, the cleanup shall abort
    let config = (hook.config as BaseConfig<T>);

    if (config.autoRunArgs && Array.isArray(config.autoRunArgs)) {
      return hook.base.run(...config.autoRunArgs);
    }
    return hook.base.run();
  }
}


// this is a mini version of useAsyncState
// this hook uses fewer hooks and has fewer capabilities that useAsyncState
// its usage should be when you want to have control over a source
// and you do not intend to have it auto run, dependencies, manage payload
// etc etc.
// this is like useSyncExternalStore, but returns an object with several
// functions that allows controlling the external source. So, may be better ?
// this hook can use directly useSES on the asyncState instance
// but this will require additional memoization to add the other properties
// that UseAsyncState has (abort, mergePayload, invalidateCache, run, replaceState ...)
export function useSource<T>(
  source: Source<T>
): UseAsyncState<T, State<T>> {
  return useSourceLane(source);
}

export function useSourceLane<T>(
  source: Source<T>,
  lane?: string,
): UseAsyncState<T, State<T>> {
  const hook: StateHook<T, State<T>> = useCurrentHook();
  const contextValue = React.useContext<StateContextValue>(AsyncStateContext);

  React.useMemo(() => hook.update(2, source, contextValue, {lane}),
    [contextValue, lane]);

  const [selectedValue, setSelectedValue] = React
    .useState<Readonly<UseAsyncState<T, State<T>>>>(calculateStateValue.bind(null, hook));

  if (
    selectedValue.version !== hook.instance?.version ||
    selectedValue.source !== hook.instance?._source
  ) {
    updateSelectedValue();
  }

  if (hook.current !== selectedValue.state) {
    hook.current = selectedValue.state;
  }
  if (hook.version !== selectedValue.version) {
    hook.version = selectedValue.version;
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

// this is a mini version of useAsyncState
// this hook uses fewer hooks and has fewer capabilities that useAsyncState
// its usage should be when you want to have control over a producer (may be inline)
// and you do not intend to have it auto run, dependencies, manage payload
// etc etc.
// this is like useSyncExternalStore, but returns an object with several
// functions that allows controlling the external source. So, may be better ?
// this hook can use directly useSES on the asyncState instance
// but this will require additional memoization to add the other properties
// that UseAsyncState has (abort, mergePayload, invalidateCache, run, replaceState ...)
export function useProducer<T>(
  producer: Producer<T>,
): UseAsyncState<T, State<T>> {
  const hook: StateHook<T, State<T>> = useCurrentHook();
  const contextValue = React.useContext<StateContextValue>(AsyncStateContext);

  React.useMemo(() => hook.update(3, producer, contextValue), [contextValue]);

  const [selectedValue, setSelectedValue] = React
    .useState<Readonly<UseAsyncState<T, State<T>>>>(calculateStateValue.bind(null, hook));

  if (
    selectedValue.version !== hook.instance?.version ||
    selectedValue.source !== hook.instance?._source
  ) {
    updateSelectedValue();
  }

  if (hook.current !== selectedValue.state) {
    hook.current = selectedValue.state;
  }
  if (hook.version !== selectedValue.version) {
    hook.version = selectedValue.version;
  }

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



function invokeSubscribeEvents<T>(
  events: UseAsyncStateEventSubscribe<T> | undefined,
  run: (...args: any[]) => AbortFn,
  instance?: StateInterface<T>,
): CleanupFn[] | null {
  if (!events || !instance) {
    return null;
  }

  let eventProps: SubscribeEventProps<T> = {
    run,
    getState: () => instance.state,
    invalidateCache: instance.invalidateCache,
  };

  let handlers: ((props: SubscribeEventProps<T>) => CleanupFn)[]
    = Array.isArray(events) ? events : [events];

  return handlers.map(handler => handler(eventProps));
}


function invokeChangeEvents<T>(
  nextState: State<T>,
  events: UseAsyncStateEvents<T> | undefined
) {
  if (!events?.change) {
    return;
  }

  const changeHandlers: UseAsyncStateEventFn<T>[]
    = Array.isArray(events.change) ? events.change : [events.change];

  const eventProps = {state: nextState};

  changeHandlers.forEach(event => {
    if (typeof event === "object") {
      const {handler, status} = event;
      if (!status || nextState.status === status) {
        handler(eventProps);
      }
    } else {
      event(eventProps);
    }
  });
}

function readStateFromInstance<T, E = State<T>>(
  asyncState: StateInterface<T> | null,
  flags: number,
  config: MixedConfig<T, E>
): E {
  if (!asyncState) {
    return undefined as E;
  }
  const selector = flags & SELECTOR
    ? (config as PartialUseAsyncStateConfiguration<T, E>).selector!
    :
    (<K>(obj): K => obj);
  return selector(asyncState.state, asyncState.lastSuccess, asyncState.cache);
}

class StateHookImpl<T, E> implements StateHook<T, E> {
  current: E;
  flags: number;
  name: string | undefined;
  config: MixedConfig<T, E>;
  origin: number | undefined;
  version: number | undefined;
  base: BaseUseAsyncState<T, E>;
  context: StateContextValue | null;
  instance: StateInterface<T> | null;

  subscribe: (
    setGuard: React.Dispatch<React.SetStateAction<number>>,
    onChange: () => void,
  ) => AbortFn

  constructor() {
    this.flags = NO_MODE;
    this.context = null;
  }

  update(
    origin: number,
    newConfig: MixedConfig<T, E>,
    contextValue: StateContextValue | null,
    overrides?: PartialUseAsyncStateConfiguration<T, E>
  ) {
    let nextFlags = getFlagsFromConfig(newConfig, contextValue, overrides);
    let instance = resolveInstance(nextFlags, newConfig, contextValue, this, overrides);

    if (!instance && !(nextFlags & WAIT)) {
      throw new Error("Mode isn't wait and instance isn't defined! this is a bug");
    }


    if (instance && (nextFlags & CONFIG_OBJECT && (newConfig as BaseConfig<T>).payload)) {
      instance.mergePayload((newConfig as BaseConfig<T>).payload);
    }
    if (instance && (nextFlags & INSIDE_PROVIDER)) {
      instance.mergePayload(contextValue?.getPayload());
    }

    this.origin = origin;
    this.flags = nextFlags;
    this.config = newConfig;
    this.instance = instance;
    this.context = contextValue;
    this.base = makeBaseReturn(this);
    this.name = calculateSubscriptionKey(this);
    this.subscribe = createSubscribeAndWatchFunction(this);
  }

}

function calculateSubscriptionKey<T, E>(hook: StateHook<T, E>): string | undefined {
  if (hook.flags & CONFIG_OBJECT && (hook.config as BaseConfig<T>).subscriptionKey) {
    return (hook.config as BaseConfig<T>).subscriptionKey;
  }
  if (hook.flags & WAIT) {
    return;
  }
  if (__DEV__) {
    let callerName = computeCallerName(5);
    let index = ++((hook.instance! as AsyncState<T>).subsIndex);
    return `${callerName}-${index}`;
  }
}

//region useAsyncState value construction
// @ts-ignore
function noop(): undefined {
  // that's a noop fn
}
function makeBaseReturn<T, E>(hook: StateHook<T, E>) {
  if (!hook.instance) {
    let output = {
      run: noop,
      runc: noop,
      abort: noop,
      replay: noop,
      setState: noop,
      flags: hook.flags,
      mergePayload: noop,
      uniqueId: undefined,
      key: "configurationKey",
      invalidateCache: noop,
      // @ts-ignore
      runp: noop as ((...args: any[]) => Promise<State<T>>),
      // @ts-ignore
    } as BaseUseAsyncState<T, E>;
    if (__DEV__) {
      // @ts-ignore
      output.devFlags = humanizeDevFlags(hook.flags);
    }
    return output;
  }

  let instance = hook.instance;
  const effectsCreator = hook.context?.producerEffectsCreator ?? standaloneProducerEffectsCreator;

  let output = {
    flags: hook.flags,
    key: instance.key,
    abort: instance.abort,
    replay: instance.replay,
    source: instance._source,
    version: instance.version,
    setState: instance.setState,
    uniqueId: instance.uniqueId,
    mergePayload: instance.mergePayload,
    invalidateCache: instance.invalidateCache,

    run: instance.run.bind(instance, effectsCreator),
    runp: instance.runp.bind(instance, effectsCreator),
    runc: instance.runc.bind(instance, effectsCreator),
  };
  if (__DEV__) {
    // @ts-ignore
    output.devFlags = humanizeDevFlags(hook.flags);
  }
  return output;
}

// come here only in standalone mode
function patchInstance<T>(
  instance: StateInterface<T>,
  flags: number,
  config: MixedConfig<T, any>
) {
  let key = readKeyFromConfig(flags, config, instance);
  let producer = readProducerFromConfig(flags, config);
  let producerConfig = flags & CONFIG_OBJECT ? (config as BaseConfig<T>) : undefined;

  instance.key = key;
  instance.replaceProducer(producer);
  instance.patchConfig(producerConfig);
}

function readProducerFromConfig<T>(
  flags: number,
  config: MixedConfig<T, any>,
): Producer<T> | undefined {
  if (flags & CONFIG_FUNCTION) {
    return config as Producer<T>;
  }

  if (flags & CONFIG_OBJECT) {
    return (config as BaseConfig<T>).producer;
  }

  return undefined;
}

function readKeyFromConfig(
  flags: number,
  config: MixedConfig<any, any>,
  prevInstance: StateInterface<any> | null
): string {
  if (flags & CONFIG_STRING) {
    return config as string;
  }

  if (flags & CONFIG_OBJECT && (config as BaseConfig<any>).key) {
    return (config as BaseConfig<any>).key!;
  }

  if (!prevInstance) {
    return nextKey();
  }

  return prevInstance.key;
}

export function resolveInstance<T>(
  flags: number,
  config: MixedConfig<T, any>,
  contextValue: StateContextValue | null,
  previousHook: StateHook<T, any>,
  overrides?: PartialUseAsyncStateConfiguration<T, any>
): StateInterface<T> | null {

  if (flags & WAIT) {
    return null;
  }

  if (flags & SOURCE) {
    if (flags & CONFIG_SOURCE) {
      let instance = readSource(config as Source<T>);
      if (flags & FORK) {
        instance = instance.fork();
      }
      if (flags & LANE) {
        let laneKey = (config as BaseConfig<T>).lane || overrides?.lane;
        instance = instance.getLane(laneKey);
      }
      return instance;
    }

    let givenConfig = config as BaseConfig<T>;
    let instance = readSource(givenConfig.source!);
    if (flags & FORK) {
      instance = instance.fork(givenConfig.forkConfig);
    }
    if (flags & LANE) {
      let laneKey = (config as BaseConfig<T>).lane || overrides?.lane;
      return instance.getLane(laneKey)
    }
    return instance;
  }

  if (flags & STANDALONE) {
    let canReuse = !!previousHook?.instance && !!(previousHook.flags & STANDALONE);
    if (canReuse) {
      patchInstance(previousHook.instance!, flags, config);
      return previousHook.instance;
    }

    let key = readKeyFromConfig(flags, config, null);
    let producer = readProducerFromConfig(flags, config);
    let producerConfig = flags & CONFIG_OBJECT ? (config as BaseConfig<T>) : undefined;

    return new AsyncState(key, producer, producerConfig);
  }

  if (flags & INSIDE_PROVIDER) {
    let key: string = flags & CONFIG_STRING
      ? (config as string) : (config as BaseConfig<T>).key!;

    if (
      flags & HOIST &&
      (config as BaseConfig<T>).hoistToProviderConfig?.override) {
      // do not check on existing because it is guaranteed to exist
      // or else we would have a WAIT flag and quit earlier!
      let key = readKeyFromConfig(flags, config, null);
      let producer = readProducerFromConfig(flags, config);
      let producerConfig = flags & CONFIG_OBJECT ? (config as BaseConfig<T>) : undefined;

      return new AsyncState(key, producer, producerConfig);
    }

    let instance = contextValue!.get<T>(key);
    if (instance) {
      if (flags & FORK) {
        instance = instance.fork((config as BaseConfig<T>).forkConfig);
      }
      if (flags & LANE) {
        return instance.getLane((config as BaseConfig<T>).lane!)
      }
      return instance;
    } else {
      let key = readKeyFromConfig(flags, config, null);
      let producer = readProducerFromConfig(flags, config);
      let producerConfig = flags & CONFIG_OBJECT ? (config as BaseConfig<T>) : undefined;

      return new AsyncState(key, producer, producerConfig);
    }
  }

  return null;
}

export interface StateHook<T, E> {
  current: E,
  flags: number,
  name: string | undefined;
  config: MixedConfig<T, E>,
  origin: number | undefined;
  version: number | undefined,
  base: BaseUseAsyncState<T, E>,
  context: StateContextValue | null,
  subscribe: (
    setGuard: React.Dispatch<React.SetStateAction<number>>,
    onChange: () => void,
  ) => AbortFn,

  instance: StateInterface<T> | null,

  update(
    origin: number,
    newConfig: MixedConfig<T, E>,
    contextValue: StateContextValue | null,
    overrides?: PartialUseAsyncStateConfiguration<T, E>
  ),
}

export function createStateHook<T, E>(): StateHook<T, E> {
  return new StateHookImpl();
}

function useCurrentHook<T, E>(): StateHook<T, E> {
  return React.useMemo<StateHook<T, E>>(createStateHook, emptyArray);
}

export function getFlagsFromConfig<T, E>(
  mixedConfig: MixedConfig<T, E>,
  contextValue: StateContextValue | null,
  overrides?: PartialUseAsyncStateConfiguration<T, E>,
): number {
  let flags = NO_MODE;

  if (contextValue !== null) {
    flags |= INSIDE_PROVIDER;
  }
  switch (typeof mixedConfig) {
    case "function": {
      flags |= STANDALONE | CONFIG_FUNCTION;
      break;
    }
    case "string": {
      flags |= CONFIG_STRING | getBaseConfigFlags(overrides);

      if (!(flags & HOIST)) {
        if (flags & INSIDE_PROVIDER) {
          if (!contextValue!.get(mixedConfig)) {
            flags |= WAIT;
          }
        } else {
          flags |= STANDALONE;
        }
      }
      break;
    }
    case "object": {
      // attempt source first
      if (isSource(mixedConfig)) {
        flags |= SOURCE | CONFIG_SOURCE;
      } else if (isSource((mixedConfig as BaseConfig<T>).source)) {
        flags |= getBaseConfigFlags(mixedConfig) | SOURCE | CONFIG_OBJECT;
      } else {
        // object and not a source
        // bind other possible flags such as fork, hoist..
        flags |= CONFIG_OBJECT | getBaseConfigFlags(mixedConfig) | getBaseConfigFlags(overrides);
        if (!(flags & HOIST)) {
          if (flags & INSIDE_PROVIDER) {
            if ((mixedConfig as BaseConfig<T>).key) {
              if (!contextValue!.get((mixedConfig as BaseConfig<T>).key!)) {
                flags |= WAIT;
              }
            } else {
              flags |= STANDALONE;
            }
          } else {
            flags |= STANDALONE;
          }
        }
      }
      break;
    }
    default:
      break;
  }
  // bind other possible flags such as fork, hoist..
  if (overrides) {
    flags |= getBaseConfigFlags(overrides);
  }

  return flags;
}

function getBaseConfigFlags<T, E>(
  config?: BaseConfig<T> | PartialUseAsyncStateConfiguration<T, E>
): number {
  if (!config) {
    return NO_MODE;
  }

  let flags = NO_MODE;

  if (config.hoistToProvider) {
    flags |= HOIST;
  }
  if (config.fork) {
    flags |= FORK;
  }
  if (config.lane) {
    flags |= LANE;
  }
  if ((config as PartialUseAsyncStateConfiguration<T, E>).selector) {
    flags |= SELECTOR;
  }
  if ((config as PartialUseAsyncStateConfiguration<T, E>).areEqual) {
    flags |= EQUALITY_CHECK;
  }
  if (config.events) {
    if (config.events.change) {
      flags |= CHANGE_EVENTS;
    }
    if (config.events.subscribe) {
      flags |= SUBSCRIBE_EVENTS;
    }
  }

  // default behavior is lazy=true; so only change if specified explicitly
  if (config.lazy === false && config.condition !== false) {
    flags |= AUTO_RUN;
  }

  return flags;
}

function createReadInConcurrentMode<T, E>(
  instance: StateInterface<T> | null,
  stateValue: E
) {
  return function readInConcurrentMode() {
    if (!instance) {
      return stateValue;
    }
    if (supportsConcurrentMode()) {
      if (
        AsyncStateStatus.pending === instance.state?.status &&
        instance.suspender
      ) {
        throw instance.suspender;
      }
    }
    return stateValue;
  }
}

function createSubscribeAndWatchFunction<T, E>(
  hook: StateHook<T, E>,
): ((...args) => AbortFn) {
  return function subscribeAndWatch(
    setGuard: React.Dispatch<React.SetStateAction<number>>,
    onChange: () => void,
  ) {

    let {flags, instance, config} = hook;


    if (flags & WAIT) {
      let key: string = flags & CONFIG_STRING
        ? (config as string) : (config as BaseConfig<T>).key!;

      return hook.context!.watch(key, (maybeInstance) => {
        if (maybeInstance !== instance) {
          setGuard(old => old + 1);
        }
      });
    }

    let contextValue = hook.context;

    // if we are hoisting or forking, spread the instance for watchers
    if (flags & INSIDE_PROVIDER && flags & (HOIST | FORK)) {
      const hoistedInstance = contextValue!.hoist(
        instance!.key,
        instance!,
        (config as BaseConfig<T>).hoistToProviderConfig
      );
      if (hoistedInstance !== instance) {
        setGuard(old => old + 1);
        return;
      }
    }

    let didClean = false;
    let cleanups: AbortFn[] = [() => didClean = true];

    function watch(mayBeNewAsyncState) {
      if (didClean) {
        return;
      }
      if (mayBeNewAsyncState !== instance) {
        setGuard(old => old + 1);
      }
    }

    if (
      flags & INSIDE_PROVIDER &&
      !(flags & SOURCE) &&
      !(flags & STANDALONE)
    ) {
      cleanups.push(contextValue!.watch(instance!.key, watch));
    }

    // if inside provider and not source request context disposal of instance
    if (
      flags & INSIDE_PROVIDER &&
      !(flags & SOURCE) &&
      (flags & (HOIST | FORK | STANDALONE))
    ) {
      cleanups.push(() => contextValue!.dispose(instance!));
    }

    function onStateChange() {
      let newSelectedState = readStateFromInstance(instance, flags, config);

      if (flags & EQUALITY_CHECK) {
        let areEqual = (config as PartialUseAsyncStateConfiguration<T, E>)
          .areEqual!(newSelectedState, hook.current);

        if (!areEqual) {
          onChange();
        }
      } else {
        onChange();
      }

      if (flags & CHANGE_EVENTS) {
        invokeChangeEvents(instance!.state, (config as BaseConfig<T>).events);
      }
    }
    // subscription

    cleanups.push(instance!.subscribe({
      key: hook.name,
      flags: hook.flags,
      cb: onStateChange,
      origin: hook.origin,
    }));
    if (instance!.version !== hook.version) {
      onChange();
    }

    if (flags & SUBSCRIBE_EVENTS) {
      const effectsCreator = flags & INSIDE_PROVIDER ?
        contextValue!.producerEffectsCreator : standaloneProducerEffectsCreator;

      let unsubscribeFns = invokeSubscribeEvents(
        (config as BaseConfig<T>).events!.subscribe!,
        instance!.run.bind(instance!, effectsCreator),
        instance!,
      );

      if (unsubscribeFns) {
        cleanups = cleanups.concat(unsubscribeFns);
      }
    }

    return function cleanup() {
      cleanups.forEach(cb => {
        if (cb) {
          cb();
        }
      });
    }
  }
}
function calculateStateValue<T, E>(
  hook: StateHook<T, E>,
): Readonly<UseAsyncState<T, E>> {
  let instance = hook.instance;

  const newState = shallowClone(hook.base);
  const newValue = readStateFromInstance(instance, hook.flags, hook.config);

  newState.read = createReadInConcurrentMode(instance, newValue);
  newState.state = newValue;
  newState.version = instance?.version;
  newState.lastSuccess = instance?.lastSuccess;
  return newState;
}
