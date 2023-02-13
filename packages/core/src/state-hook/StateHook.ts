import {
  BaseConfig,
  BaseUseAsyncState,
  CleanupFn,
  MixedConfig,
  PartialUseAsyncStateConfiguration,
  SubscribeEventProps,
  UseAsyncState, UseAsyncStateChangeEvent,
  UseAsyncStateEventFn,
  UseAsyncStateEvents,
  UseAsyncStateEventSubscribe
} from "./types.internal";
import {
  AbortFn,
  PoolInterface,
  Producer,
  ProducerConfig,
  Source,
  State,
  StateInterface,
  LibraryPoolsContext
} from "../types";
import {
  readSource,
  AsyncState,
} from "../AsyncState";

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
import {
  __DEV__,
  isFunction,
  nextKey,
} from "../utils";
import {error, Status, pending} from "../enums";
import {isSource} from "../helpers/isSource";
import {freeze, isArray} from "../helpers/corejs";
import {mapFlags} from "../helpers/mapFlags";

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

let ConfigurationSpecialFlags = freeze({
  "fork": FORK,
  "lane": LANE,
  "selector": SELECTOR,
  "areEqual": EQUALITY_CHECK,
  "events": (events) => {
    if (events) {
      if (events.change) {
        return CHANGE_EVENTS;
      }
      if (events.subscribe) {
        return SUBSCRIBE_EVENTS;
      }
    }
    return NO_MODE;
  },
  "lazy": (lazy) => lazy === false ? AUTO_RUN : NO_MODE,
});

function getConfigFlags<T, E, R, S>(
  config?: PartialUseAsyncStateConfiguration<T, E, R, S>
): number {
  if (!config) {
    return NO_MODE;
  }
  let flags = NO_MODE;
  for (let key of Object.keys(config)) {
    let flagsReader = ConfigurationSpecialFlags[key];

    if (isFunction(flagsReader)) {
      flags |= flagsReader(config[key]);
    } else if (typeof flagsReader === "number" && config[key]) {
      flags |= flagsReader;
    }
  }
  return flags;
}


function resolveInstance<T, E, R, S>(
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

    if (Object.prototype.hasOwnProperty.call(config, "producer")) {
      instance.replaceProducer(producer);
    }
    if (producerConfig) {
      instance.patchConfig(producerConfig);
    }

    return instance;
  }

  let instance: StateInterface<T, E, R> = new AsyncState(
    key, producer, Object.assign({}, producerConfig, {context: pool.context.context}), pool.simpleName);

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


function makeBaseReturn<T, E, R, S>(
  flags: number,
  config: MixedConfig<T, E, R, S>,
  instance: StateInterface<T, E, R> | null,
) {
  if (!instance) {
    let key = flags & CONFIG_STRING ? config : (config as BaseConfig<T, E, R>).key;
    let output = {key, flags} as BaseUseAsyncState<T, E, R, S>;
    if (__DEV__) {
      output.devFlags = mapFlags(flags);
    }
    return output;
  }

  let output = Object.assign({}, instance._source, {flags, source: instance._source}
  ) as BaseUseAsyncState<T, E, R, S>;

  if (__DEV__) {
    output.devFlags = mapFlags(flags);
  }
  return output;
}


function calculateSubscriptionKey<T, E, R, S>(
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


export function hookReturn<T, E, R, S>(
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

  return freeze(newState);
}

function createReadInConcurrentMode<T, E, R, S>(
  instance: StateInterface<T, E, R>,
  stateValue: S,
  suspend: boolean = true,
  throwError: boolean = true,
) {
  if (suspend && pending === instance.state.status && instance.suspender) {
    throw instance.suspender;
  }
  if (throwError && error === instance.state.status) {
    throw instance.state.data;
  }
  return stateValue;
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
    = isArray(events) ? events : [events];

  return handlers.map(handler => handler(eventProps));
}

function invokeChangeEvents<T, E, R>(
  instance: StateInterface<T, E, R>,
  events: UseAsyncStateEventFn<T, E, R> | UseAsyncStateEventFn<T, E, R>[]
) {
  let nextState = instance.state;
  const changeHandlers: UseAsyncStateEventFn<T, E, R>[]
    = isArray(events) ? events : [events];

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

export type HookChangeEvents<T, E, R> = UseAsyncStateEventFn<T, E, R> | UseAsyncStateEventFn<T, E, R>[];

export interface HookOwnState<T, E, R, S> {
  context: LibraryPoolsContext,
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
  },
  getEvents(): HookChangeEvents<T, E, R> | undefined,

  subscribeEffect(
    updateState: () => void,
    setGuard: ((updater: ((prev: number) => number)) => void),
  ): CleanupFn,
}

export function subscribeEffect<T, E, R, S>(
  hookState: HookOwnState<T, E, R, S>,
  updateState: () => void,
  setGuard: ((updater: ((prev: number) => number)) => void),
): CleanupFn {
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

    let maybeEvents = hookState.getEvents();
    if (flags & CHANGE_EVENTS) {
      let changeEvents = (config as BaseConfig<T, E, R>).events?.change;
      if (changeEvents) {
        invokeChangeEvents(instance!, changeEvents);
      }
    }
    if (maybeEvents) {
      invokeChangeEvents(instance!, maybeEvents);
    }
  }

  // subscription
  cleanups.push(instance!.subscribe({
    flags,
    key: subKey,
    cb: onStateChange,
  }));
  if (instance!.version !== renderInfo.version) {
    updateState();
  }

  if (flags & SUBSCRIBE_EVENTS) {

    let unsubscribeFns = invokeSubscribeEvents(
      (config as BaseConfig<T, E, R>).events!.subscribe,
      instance!.run,
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


function resolvePool<T, E, R, S>(
  context: LibraryPoolsContext,
  mixedConfig: MixedConfig<T, E, R, S>
) {
  let pool = typeof mixedConfig === "object" && (mixedConfig as ProducerConfig<T, E, R>).pool;
  return context.getOrCreatePool(pool || "default");
}

export function createHook<T, E, R, S>(
  executionContext: LibraryPoolsContext,
  config: MixedConfig<T, E, R, S>,
  deps: any[],
  guard: number,
  overrides?: PartialUseAsyncStateConfiguration<T, E, R, S>,
  caller?: string,
): HookOwnState<T, E, R, S> {
  let newPool = resolvePool(executionContext, config);
  let newFlags = resolveFlags(config, newPool, overrides);
  let newInstance = resolveInstance(newPool, newFlags, config, overrides);

  if (!newInstance && !(newFlags & WAIT)) {
    throw new Error("Undefined instance with no WAIT mode. This is a bug.");
  }

  let baseReturn = makeBaseReturn(newFlags, config, newInstance);
  baseReturn.onChange = onChange;

  let currentReturn = hookReturn(newFlags, config, baseReturn, newInstance);
  let subscriptionKey = calculateSubscriptionKey(newFlags, config, caller, newInstance);

  if (newInstance && newFlags & CONFIG_OBJECT) {
    let configObject = config as BaseConfig<T, E, R>;
    if (configObject.payload) {
      newInstance.mergePayload(configObject.payload);
    }
  }

  let changeEvents: HookChangeEvents<T, E, R> | undefined = undefined;
  // ts complains about subscribeEffect not present, it is assigned later
  // @ts-ignore
  let hook: HookOwnState<T, E, R, S> = {
    deps,
    guard,
    config,
    pool: newPool,
    flags: newFlags,
    base: baseReturn,
    return: currentReturn,
    instance: newInstance,
    subKey: subscriptionKey,
    context: executionContext,
    renderInfo: {
      current: currentReturn.state,
      version: currentReturn.version,
    },
    getEvents() {
      return changeEvents;
    },
  };
  hook.subscribeEffect = subscribeEffect.bind(null, hook);

  return hook;

  function onChange(
    events: (((prevEvents?: HookChangeEvents<T, E, R>) => HookChangeEvents<T, E, R>) | HookChangeEvents<T, E, R>)
  ) {
    if (isFunction(events)) {
      let maybeEvents = (events as (prevEvents?: HookChangeEvents<T, E, R>) => HookChangeEvents<T, E, R>)(changeEvents);
      if (maybeEvents) {
        changeEvents = maybeEvents;
      }
    } else if (events) {
      changeEvents = (events as HookChangeEvents<T, E, R>);
    }
  };
}

export function autoRun<T, E, R, S>(hookState: HookOwnState<T, E, R, S>): CleanupFn {
  let {flags, instance, config, base} = hookState;
  // auto run only if condition is met, and it is not lazy
  if (!(flags & AUTO_RUN)) {
    return;
  }
  // if dependencies change, if we run, the cleanup shall abort
  let shouldRun = true;

  if (flags & CONFIG_OBJECT) {
    let configObject = (config as BaseConfig<T, E, R>);
    if (isFunction(configObject.condition)) {
      let conditionFn = configObject.condition as
        ((state: State<T, E, R>, args?: any[], payload?: Record<string, any> | null) => boolean);

      shouldRun = conditionFn(instance!.getState(), configObject.autoRunArgs, instance!.getPayload());
    } else if (configObject.condition === false) {
      shouldRun = false;
    }
  }

  if (shouldRun) {
    if (flags & CONFIG_OBJECT && (config as BaseConfig<T, E, R>).autoRunArgs) {
      let {autoRunArgs} = (config as BaseConfig<T, E, R>);
      if (autoRunArgs && isArray(autoRunArgs)) {
        return base.run.apply(null, autoRunArgs);
      }
    }

    return base.run();
  }
}
