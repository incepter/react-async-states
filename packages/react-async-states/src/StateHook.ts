import * as React from "react";
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
  UseAsyncStateEventSubscribe
} from "./types.internal";
import {
  AsyncState,
  AbortFn,
  Status,
  Producer,
  Source,
  State,
  StateInterface,
  readSource,
  standaloneProducerEffectsCreator,
  isSource,
  nextKey
} from "async-states";
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
import {__DEV__, humanizeDevFlags, isFunction} from "./shared";

export interface StateHook<T, E = any, R = any, S = any> {
  current: S,
  flags: number,
  caller?: string,
  name: string | undefined;
  config: MixedConfig<T, E, R, S>,
  origin: number | undefined;
  version: number | undefined,
  base: BaseUseAsyncState<T, E, R, S>,
  context: StateContextValue | null,
  subscribe: (
    setGuard: React.Dispatch<React.SetStateAction<number>>,
    onChange: () => void,
  ) => AbortFn,

  instance: StateInterface<T, E, R> | null,

  update(
    origin: number,
    newConfig: MixedConfig<T, E, R, S>,
    contextValue: StateContextValue | null,
    overrides?: PartialUseAsyncStateConfiguration<T, E, R, S>,
  ),
}

export class StateHookImpl<T, E, R, S> implements StateHook<T, E, R, S> {
  current: S;
  flags: number;
  caller?: string;
  name: string | undefined;
  config: MixedConfig<T, E, R, S>;
  origin: number | undefined;
  version: number | undefined;
  base: BaseUseAsyncState<T, E, R, S>;
  context: StateContextValue | null;
  instance: StateInterface<T, E, R> | null;

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
    newConfig: MixedConfig<T, E, R, S>,
    contextValue: StateContextValue | null,
    overrides?: PartialUseAsyncStateConfiguration<T, E, R, S>,
  ) {
    let nextFlags = resolveFlags(newConfig, contextValue, overrides);
    let instance = resolveInstance(nextFlags, newConfig, contextValue, this, overrides);

    if (!instance && !(nextFlags & WAIT)) {
      throw new Error("Undefined instance with no WAIT mode. This is a bug.");
    }

    if (instance && (nextFlags & CONFIG_OBJECT && (newConfig as BaseConfig<T, E, R>).payload)) {
      instance.mergePayload((newConfig as BaseConfig<T, E, R>).payload);
    }
    if (instance && (nextFlags & INSIDE_PROVIDER) && contextValue!.getPayload()) {
      instance.mergePayload(contextValue!.getPayload()!);
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

export function resolveFlags<T, E, R, S>(
  mixedConfig: MixedConfig<T, E, R, S>,
  contextValue: StateContextValue | null,
  overrides?: PartialUseAsyncStateConfiguration<T, E, R, S>,
): number {

  let flags = NO_MODE;
  if (contextValue !== null) {
    flags |= INSIDE_PROVIDER;
  }

  switch (typeof mixedConfig) {
    case "function": {
      return flags | CONFIG_FUNCTION | STANDALONE | getConfigFlags(overrides);
    }

    case "string": {
      flags |= CONFIG_STRING | getConfigFlags(overrides);
      if (!(flags & HOIST) && !(flags & INSIDE_PROVIDER)) {
        return flags | STANDALONE;
      }
      if (!(flags & HOIST) && !contextValue!.get(mixedConfig)) {
        return flags | WAIT;
      }
      return flags;
    }

    case "object": {
      // attempt source first
      let baseConfig = mixedConfig as BaseConfig<T, E, R>;
      if (isSource(baseConfig)) {
        return flags | CONFIG_SOURCE | SOURCE | getConfigFlags(overrides);
      } else if (isSource(baseConfig.source)) {
        return flags | CONFIG_OBJECT | SOURCE | getConfigFlags(baseConfig) | getConfigFlags(overrides);
      } else {
        flags |= CONFIG_OBJECT | getConfigFlags(baseConfig) | getConfigFlags(overrides);
        if (!(flags & HOIST) && !(flags & INSIDE_PROVIDER) || !baseConfig.key) {
          return flags | STANDALONE;
        }
        if (!(flags & HOIST) && baseConfig.key && !contextValue!.get(baseConfig.key)) {
          return flags | WAIT;
        }
        return flags;
      }
    }
    default: {
      return flags | STANDALONE | getConfigFlags(overrides);
    }
  }
}

function getKeyFlags(
  config: PartialUseAsyncStateConfiguration<any, any, any, any>,
  key: string,
) {
  switch (key) {
    case "hoist": return config.hoist ? HOIST : NO_MODE;
    case "fork": return config.fork ? FORK : NO_MODE;
    case "lane": return config.lane ? LANE : NO_MODE;
    case "selector": return isFunction(config.selector) ? SELECTOR : NO_MODE;
    case "areEqual": return isFunction(config.areEqual) ? EQUALITY_CHECK : NO_MODE;

    case "events": {
      let flags = NO_MODE;
      if (config.events!.change) {
        flags |= CHANGE_EVENTS;
      }
      if (config.events!.subscribe) {
        flags |= SUBSCRIBE_EVENTS;
      }
      return flags;
    }

    case "lazy":
    case "condition": {
      if (config.lazy === false && config.condition !== false) {
        return AUTO_RUN;
      }
      return NO_MODE;
    }
    default: return NO_MODE;
  }
}

export function getConfigFlags<T, E, R, S>(
  config?: PartialUseAsyncStateConfiguration<T, E, R, S>
): number {
  if (!config) {
    return NO_MODE;
  }
  return Object.keys(config)
    .reduce((flags, key) =>
      (flags | getKeyFlags(config, key)), NO_MODE);
}


export function resolveInstance<T, E, R, S>(
  flags: number,
  config: MixedConfig<T, E, R, S>,
  contextValue: StateContextValue | null,
  previousHook: StateHook<T, E, R, S> | null,
  overrides?: PartialUseAsyncStateConfiguration<T, E, R, any>
): StateInterface<T, E, R> | null {

  if (flags & WAIT) {
    return null;
  }

  if (flags & SOURCE) {
    return resolveSourceInstance<T, E, R, S>(flags, config, overrides);
  }

  if (flags & STANDALONE) {
    return resolveStandaloneInstance(previousHook, flags, config);
  }

  if (flags & INSIDE_PROVIDER) {
    return resolveProviderInstance<T, E, R, S>(flags, contextValue, config);
  }

  return null;
}


function resolveSourceInstance<T, E, R, S>(
  flags: number,
  config: MixedConfig<T, E, R, S>,
  overrides?: PartialUseAsyncStateConfiguration<T, E, R, any>
) {
  if (flags & CONFIG_SOURCE) {
    let instance = readSource(config as Source<T, E, R>);
    if (flags & FORK) {
      instance = instance.fork();
    }
    if (flags & LANE) { // config is a source, so ofc doesn't contain lane prop
      let laneKey = overrides?.lane;
      instance = instance.getLane(laneKey);
    }
    return instance;
  }

  let givenConfig = config as BaseConfig<T, E, R>;
  let instance = readSource(givenConfig.source!);
  if (flags & FORK) {
    instance = instance.fork(givenConfig.forkConfig);
  }
  if (flags & LANE) {
    let laneKey = (config as BaseConfig<T, E, R>).lane || overrides?.lane;
    return instance.getLane(laneKey)
  }
  return instance;
}

function resolveStandaloneInstance<T, E, R, S>(
  hook: StateHook<T, E, R, S> | null,
  flags: number,
  config: MixedConfig<T, E, R, S>
) {

  let canReuse = hook && !!hook.instance && !!(hook.flags & STANDALONE);
  if (canReuse) {
    patchInstance(hook!.instance!, flags, config);
    return hook!.instance;
  }

  let key = readKeyFromConfig(flags, config, null);
  let producer = readProducerFromConfig(flags, config);
  let producerConfig = flags & CONFIG_OBJECT ? (config as BaseConfig<T, E, R>) : undefined;

  return new AsyncState(key, producer, producerConfig);
}

function resolveProviderInstance<T, E, R, S>(
  flags: number,
  contextValue: StateContextValue | null,
  config: MixedConfig<T, E, R, any>
) {
  let key: string = flags & CONFIG_STRING
    ? (config as string) : (config as BaseConfig<T, E, R>).key!;

  if (
    flags & HOIST &&
    flags & CONFIG_OBJECT &&
    (config as BaseConfig<T, E, R>).hoistConfig?.override) {
    // do not check on existing because it is guaranteed to exist
    // or else we would have a WAIT flag and quit earlier!
    let key = readKeyFromConfig(flags, config, null);
    let producer = readProducerFromConfig(flags, config);
    let producerConfig = flags & CONFIG_OBJECT ? (config as BaseConfig<T, E, R>) : undefined;

    return new AsyncState(key, producer, producerConfig);
  }

  let instance = contextValue!.get<T, E, R>(key);
  if (instance) {
    if (flags & FORK) {
      instance = instance.fork((config as BaseConfig<T, E, R>).forkConfig);
    }
    if (flags & LANE) {
      return instance.getLane((config as BaseConfig<T, E, R>).lane!)
    }
    return instance;
  } else {
    let key = readKeyFromConfig(flags, config, null);
    let producer = readProducerFromConfig(flags, config);
    let producerConfig = flags & CONFIG_OBJECT ? (config as BaseConfig<T, E, R>) : undefined;

    return new AsyncState(key, producer, producerConfig);
  }
}

function patchInstance<T, E, R>(
  instance: StateInterface<T, E, R>,
  flags: number,
  config: MixedConfig<T, E, R, any>
) {
  let key = readKeyFromConfig(flags, config, instance);
  let producer = readProducerFromConfig(flags, config);
  let producerConfig = flags & CONFIG_OBJECT ? (config as BaseConfig<T, E, R>) : undefined;

  instance.key = key;
  instance.replaceProducer(producer);
  instance.patchConfig(producerConfig);
}

function readKeyFromConfig(
  flags: number,
  config: MixedConfig<any, any, any, any>,
  prevInstance: StateInterface<any, any, any> | null
): string {
  if (flags & CONFIG_STRING) {
    return config as string;
  }

  if (flags & CONFIG_OBJECT && (config as BaseConfig<any, any, any>).key) {
    return (config as BaseConfig<any, any, any>).key!;
  }

  if (!prevInstance) {
    return nextKey();
  }

  return prevInstance.key;
}


function readProducerFromConfig<T, E, R>(
  flags: number,
  config: MixedConfig<T, E, R, any>,
): Producer<T, E, R> | undefined {
  if (flags & CONFIG_FUNCTION) {
    return config as Producer<T, E, R>;
  }

  if (flags & CONFIG_OBJECT) {
    return (config as BaseConfig<T, E, R>).producer;
  }

  return undefined;
}


export function makeBaseReturn<T, E, R, S>(hook: StateHook<T, E, R, S>) {
  if (!hook.instance) {
    let {flags, config} = hook;
    let key = flags & CONFIG_STRING ? config : (config as BaseConfig<T, E, R>).key;
    let output = Object.assign({key, flags}) as BaseUseAsyncState<T, E, R, S>;
    if (__DEV__) {
      output.devFlags = humanizeDevFlags(hook.flags);
    }
    return output;
  }

  let {instance} = hook;
  const effectsCreator = hook.context?.createEffects ?? standaloneProducerEffectsCreator;

  let output = Object.assign({},
    instance._source,
    {
      flags: hook.flags,
      source: instance._source,
      run: instance.run.bind(instance, effectsCreator),
      runp: instance.runp.bind(instance, effectsCreator),
      runc: instance.runc.bind(instance, effectsCreator)
    }
  ) as BaseUseAsyncState<T, E, R, S>;

  if (__DEV__) {
    output.devFlags = humanizeDevFlags(hook.flags);
  }
  return output;
}


function calculateSubscriptionKey<T, E, R, S>(
  hook: StateHook<T, E, R, S>, level = 9): string | undefined {
  if (hook.flags & CONFIG_OBJECT && (hook.config as BaseConfig<T, E, R>).subscriptionKey) {
    return (hook.config as BaseConfig<T, E, R>).subscriptionKey;
  }
  if (hook.flags & WAIT) {
    return;
  }
  if (__DEV__) {
    let callerName = hook.caller;
    if ((hook.instance! as AsyncState<T, E, R>).subsIndex === undefined) {
      (hook.instance! as AsyncState<T, E, R>).subsIndex = 0;
    }
    let index = ++((hook.instance! as AsyncState<T, E, R>).subsIndex!);
    return `${callerName}-${index}`;
  }
}


export function calculateStateValue<T, E, R, S>(
  hook: StateHook<T, E, R, S>,
): Readonly<UseAsyncState<T, E, R, S>> {
  let instance = hook.instance;

  const newState = Object.assign({}, hook.base) as UseAsyncState<T, E, R, S>;
  const newValue = readStateFromInstance(instance, hook.flags, hook.config);
  if (instance) {
    newState.read = createReadInConcurrentMode.bind(null, instance, newValue);
    newState.version = instance?.version;
  }
  newState.state = newValue;
  newState.lastSuccess = instance?.lastSuccess;

  newState[Symbol.iterator] = function*() {
    yield newState.state;
    yield newState.setState;
    yield newState;
  }
  newState.toArray = function() {
    return [newState.state, newState.setState, newState];
  }

  return Object.freeze(newState);
}

function createReadInConcurrentMode<T, E, R, S>(
  instance: StateInterface<T, E, R>,
  stateValue: S,
  suspend: boolean = true,
  throwError: boolean = true,
) {
  if (suspend && Status.pending === instance.state.status && instance.suspender) {
    throw instance.suspender;
  }
  if (throwError && Status.error === instance.state.status) {
    throw instance.state.data;
  }
  return stateValue;
}

function createSubscribeAndWatchFunction<T, E, R, S>(
  hook: StateHook<T, E, R, S>,
): ((...args) => AbortFn) {
  return function subscribeAndWatch(
    setGuard: React.Dispatch<React.SetStateAction<number>>,
    onChange: () => void,
  ) {
    let {flags, instance, config} = hook;

    if (flags & WAIT) {
      let key: string = flags & CONFIG_STRING
        ? (config as string) : (config as BaseConfig<T, E, R>).key!;

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
        (config as BaseConfig<T, E, R>).hoistConfig
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
        let areEqual = (config as PartialUseAsyncStateConfiguration<T, E, R, S>)
          .areEqual!(newSelectedState, hook.current);

        if (!areEqual) {
          onChange();
        }
      } else {
        onChange();
      }

      if (flags & CHANGE_EVENTS) {
        invokeChangeEvents(instance!, (config as BaseConfig<T, E, R>).events);
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
        contextValue!.createEffects : standaloneProducerEffectsCreator;

      let unsubscribeFns = invokeSubscribeEvents(
        (config as BaseConfig<T, E, R>).events!.subscribe,
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

function invokeSubscribeEvents<T, E, R>(
  events: UseAsyncStateEventSubscribe<T, E, R> | undefined,
  run: (...args: any[]) => AbortFn,
  instance?: StateInterface<T, E, R>,
): CleanupFn[] | null {
  if (!events || !instance) {
    return null;
  }

  let eventProps: SubscribeEventProps<T, E, R> = instance._source;

  let handlers: ((props: SubscribeEventProps<T, E, R>) => CleanupFn)[]
    = Array.isArray(events) ? events : [events];

  return handlers.map(handler => handler(eventProps));
}

function invokeChangeEvents<T, E, R>(
  instance: StateInterface<T, E, R>,
  events: UseAsyncStateEvents<T, E, R> | undefined
) {
  if (!events?.change) {
    return;
  }

  let nextState = instance.state;
  const changeHandlers: UseAsyncStateEventFn<T, E, R>[]
    = Array.isArray(events.change) ? events.change : [events.change];

  const eventProps = {state: nextState, source: instance._source};

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

// come here only in standalone mode


function readStateFromInstance<T, E, R, S = State<T, E, R>>(
  asyncState: StateInterface<T, E, R> | null,
  flags: number,
  config: MixedConfig<T, E, R, S>
): S {
  if (!asyncState) {
    return undefined as S;
  }
  const selector = flags & SELECTOR
    ? (config as PartialUseAsyncStateConfiguration<T, E, R, S>).selector!
    :
    (<K>(obj): K => obj);
  return selector(asyncState.state, asyncState.lastSuccess, asyncState.cache || null);
}
