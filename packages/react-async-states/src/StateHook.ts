import * as React from "react";
import {
  BaseConfig,
  BaseUseAsyncState,
  CleanupFn,
  MixedConfig,
  PartialUseAsyncStateConfiguration,
  SubscribeEventProps,
  UseAsyncState,
  UseAsyncStateEventFn,
  UseAsyncStateEvents,
  UseAsyncStateEventSubscribe
} from "./types.internal";
import {
  AbortFn,
  AsyncState,
  getOrCreatePool,
  isSource,
  nextKey,
  PoolInterface,
  Producer,
  ProducerConfig,
  readSource,
  Source,
  standaloneProducerEffectsCreator,
  State,
  StateInterface,
  Status
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
  LANE,
  NO_MODE,
  SELECTOR,
  SOURCE,
  SUBSCRIBE_EVENTS,
  WAIT
} from "./StateHookFlags";
import {__DEV__, humanizeDevFlags, isFunction} from "./shared";


let is = Object.is;
let hasOwnProperty = Object.prototype.hasOwnProperty;
export function resolveFlags<T, E, R, S>(
  mixedConfig: MixedConfig<T, E, R, S>,
  pool: PoolInterface,
  overrides?: PartialUseAsyncStateConfiguration<T, E, R, S>,
): number {

  let flags = NO_MODE;

  switch (typeof mixedConfig) {
    case "function": {
      return flags | CONFIG_FUNCTION | getConfigFlags(overrides);
    }
    case "string": {
      flags |= CONFIG_STRING | getConfigFlags(overrides);
      if (!pool.instances.has(mixedConfig) && overrides?.wait) {
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
        if (baseConfig.key && !pool.instances.has(baseConfig.key)) {
          let wait = baseConfig.wait || overrides?.wait;
          if (wait) {
            return flags | WAIT;
          }
        }
        return flags;
      }
    }
    default: {
      return flags | getConfigFlags(overrides);
    }
  }
}

function getFlagsFromConfigProperties(
  config: PartialUseAsyncStateConfiguration<any, any, any, any>,
  key: string,
) {
  switch (key) {
    case "fork":
      return config.fork ? FORK : NO_MODE;
    case "lane":
      return config.lane ? LANE : NO_MODE;
    case "selector":
      return isFunction(config.selector) ? SELECTOR : NO_MODE;
    case "areEqual":
      return isFunction(config.areEqual) ? EQUALITY_CHECK : NO_MODE;

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
    default:
      return NO_MODE;
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
      (flags | getFlagsFromConfigProperties(config, key)), NO_MODE);
}


export function resolveInstance<T, E, R, S>(
  pool: PoolInterface,
  flags: number,
  config: MixedConfig<T, E, R, S>,
  overrides?: PartialUseAsyncStateConfiguration<T, E, R, S>
): StateInterface<T, E, R> | null {
  if (flags & WAIT) {
    return null;
  }

  if (flags & SOURCE) {
    return resolveSourceInstance<T, E, R, S>(flags, config, overrides);
  }

  return resolveStandaloneInstance(pool, flags, config, overrides);
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
  pool: PoolInterface,
  flags: number,
  config: MixedConfig<T, E, R, S>,
  overrides?: PartialUseAsyncStateConfiguration<T, E, R, S>
): StateInterface<T, E, R> {
  let key = readKeyFromConfig(flags, config, null);
  let producer = readProducerFromConfig(flags, config);
  let producerConfig = readProducerConfigFromConfig(flags, config);

  let prevInstance = pool.instances.get(key);

  if (prevInstance) {

    let instance = prevInstance;
    if (flags & FORK) {
      instance = instance.fork((config as BaseConfig<T, E, R>).forkConfig);
    }
    if (flags & LANE) {
      let lane = readLaneFromConfig(config, overrides);
      instance = instance.getLane(lane);
    }

    if (hasOwnProperty.call(config, "producer")) {
      instance.replaceProducer(producer);
    }
    if (producerConfig) {
      instance.patchConfig(producerConfig);
    }

    return instance;
  }

  let instance: StateInterface<T, E, R> = new AsyncState(
                                  key, producer, producerConfig, pool.simpleName);

  if (flags & LANE) {
    let lane = readLaneFromConfig(config, overrides);
    instance = instance.getLane(lane);
  }

  return instance;
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

function readProducerConfigFromConfig<T, E, R, S>(
  flags: number,
  config: MixedConfig<T, E, R, S>,
): ProducerConfig<T, E, R> | undefined {
  if (flags & CONFIG_FUNCTION) {
    return undefined;
  }

  if ((flags & CONFIG_OBJECT) && !(flags & SOURCE)) {
    return (config as BaseConfig<T, E, R>);
  }

  return undefined;
}


function readLaneFromConfig<T, E, R, S>(
  config: MixedConfig<T, E, R, S>,
  overrides?: PartialUseAsyncStateConfiguration<T, E, R, S>
): string | undefined {
  if (overrides && overrides.lane) {
    return overrides.lane;
  }

  return (config as BaseConfig<T, E, R>).lane;
}


export function makeBaseReturn<T, E, R, S>(
  flags: number,
  config: MixedConfig<T, E, R, S>,
  instance: StateInterface<T, E, R> | null,
) {
  if (!instance) {
    let key = flags & CONFIG_STRING ? config : (config as BaseConfig<T, E, R>).key;
    let output = Object.assign({key, flags}) as BaseUseAsyncState<T, E, R, S>;
    if (__DEV__) {
      output.devFlags = humanizeDevFlags(flags);
    }
    return output;
  }

  const effectsCreator = standaloneProducerEffectsCreator;

  let output = Object.assign({},
    instance._source,
    {
      flags,
      source: instance._source,
      run: instance.run.bind(instance, effectsCreator),
      runp: instance.runp.bind(instance, effectsCreator),
      runc: instance.runc.bind(instance, effectsCreator)
    }
  ) as BaseUseAsyncState<T, E, R, S>;

  if (__DEV__) {
    output.devFlags = humanizeDevFlags(flags);
  }
  return output;
}


export function calculateSubscriptionKey<T, E, R, S>(
  flags: number,
  config: MixedConfig<T, E, R, S>,
  callerName: string | undefined,
  stateInterface: StateInterface<T, E, R> | null,
): string | undefined {
  if (flags & CONFIG_OBJECT && (config as BaseConfig<T, E, R>).subscriptionKey) {
    return (config as BaseConfig<T, E, R>).subscriptionKey;
  }
  if (flags & WAIT || !stateInterface) {
    return;
  }
  if (__DEV__) {
    let instance = stateInterface as AsyncState<T, E, R>;
    if (instance.subsIndex === undefined) {
      instance.subsIndex = 0;
    }
    let index = ++instance.subsIndex;
    return `${callerName}-${index}`;
  }
}


export function calculateStateValue<T, E, R, S>(
  flags: number,
  config: MixedConfig<T, E, R, S>,
  base: BaseUseAsyncState<T, E, R, S>,
  instance: StateInterface<T, E, R> | null,
): Readonly<UseAsyncState<T, E, R, S>> {

  const newState = Object.assign({}, base) as UseAsyncState<T, E, R, S>;
  const newValue = readStateFromInstance(instance, flags, config);
  if (instance) {
    newState.read = createReadInConcurrentMode.bind(null, instance, newValue);
    newState.version = instance?.version;
  }
  newState.state = newValue;
  newState.lastSuccess = instance?.lastSuccess;

  newState[Symbol.iterator] = function* () {
    yield newState.state;
    yield newState.setState;
    yield newState;
  }
  newState.toArray = function () {
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

export function invokeSubscribeEvents<T, E, R>(
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

export function invokeChangeEvents<T, E, R>(
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


export function readStateFromInstance<T, E, R, S = State<T, E, R>>(
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

export type HookOwnState<T, E, R, S> = {
  guard: number,
  pool: PoolInterface,
  config: MixedConfig<T, E, R, S>,
  return: UseAsyncState<T, E, R, S>,
  base: BaseUseAsyncState<T, E, R, S>,
  deps: any[],
  subKey: string | undefined,
  flags: number,
  instance: StateInterface<T, E, R> | null,
  renderInfo: {
    current: S,
    version: number | undefined,
  }
}
export function subscribeEffectImpl<T, E, R, S>(
  hookState: HookOwnState<T, E, R, S>,
  updateState: () => void,
  setGuard: React.Dispatch<React.SetStateAction<number>>,
  origin: 1 | 2 | 3
) {
  let {flags, config, instance, renderInfo, subKey, pool} = hookState;
  if (flags & WAIT) {
    let key: string = flags & CONFIG_STRING
      ? (config as string) : (config as BaseConfig<T, E, R>).key!;

    return pool.watch(key, function () {
      setGuard(old => old + 1);
    });
  }


  let didClean = false;
  let cleanups: AbortFn[] = [() => didClean = true];

  function onStateChange() {
    let newSelectedState = readStateFromInstance(instance, flags, config);

    if (flags & EQUALITY_CHECK) {
      let areEqual = (config as PartialUseAsyncStateConfiguration<T, E, R, S>)
        .areEqual!(newSelectedState, renderInfo.current);

      if (!areEqual) {
        updateState();
      }
    } else {
      updateState();
    }

    if (flags & CHANGE_EVENTS) {
      invokeChangeEvents(instance!, (config as BaseConfig<T, E, R>).events);
    }
  }

  // subscription

  cleanups.push(instance!.subscribe({
    flags,
    origin,
    key: subKey,
    cb: onStateChange,
  }));
  if (instance!.version !== renderInfo.version) {
    updateState();
  }

  if (flags & SUBSCRIBE_EVENTS) {
    const effectsCreator = standaloneProducerEffectsCreator;

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


function resolvePool<T, E, R, S>(mixedConfig: MixedConfig<T, E, R, S>) {
  let pool = typeof mixedConfig === "object" && (mixedConfig as ProducerConfig<T, E, R>).pool;
  return getOrCreatePool(pool || "default");
}

export function calculateHook<T, E, R, S>(
  config: MixedConfig<T, E, R, S>,
  deps: any[],
  guard: number,
  overrides?: PartialUseAsyncStateConfiguration<T, E, R, S>,
  caller?: string,
): HookOwnState<T, E, R, S> {
  let newPool = resolvePool(config);
  let newFlags = resolveFlags(config, newPool, overrides);
  let newInstance = resolveInstance(newPool, newFlags, config, overrides);

  if (!newInstance && !(newFlags & WAIT)) {
    throw new Error("Undefined instance with no WAIT mode. This is a bug.");
  }

  let baseReturn = makeBaseReturn(newFlags, config, newInstance);
  let currentReturn = calculateStateValue(newFlags, config, baseReturn, newInstance);
  let subscriptionKey = calculateSubscriptionKey(newFlags, config, caller, newInstance);

  if (newInstance && newFlags & CONFIG_OBJECT) {
    let configObject = config as BaseConfig<T, E, R>;
    if (configObject.payload) {
      newInstance.mergePayload(configObject.payload);
    }
  }

  return {
    deps,
    guard,
    config,
    pool: newPool,
    flags: newFlags,
    base: baseReturn,
    return: currentReturn,
    instance: newInstance,
    subKey: subscriptionKey,
    renderInfo: {
      current: currentReturn.state,
      version: currentReturn.version,
    }
  }
}

export function areHookInputEqual(deps: any[], deps2: any[]) {
  if (deps.length !== deps2.length) {
    return false;
  }
  for (let i = 0, {length} = deps; i < length; i += 1) {
    if (!is(deps[i], deps2[i])) {
      return false;
    }
  }
  return true;
}
