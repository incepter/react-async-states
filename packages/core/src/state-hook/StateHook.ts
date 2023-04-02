import {
  BaseConfig,
  BaseUseAsyncState,
  CleanupFn,
  MixedConfig,
  PartialUseAsyncStateConfiguration,
  SubscribeEventProps,
  UseAsyncState,
  UseAsyncStateEventFn,
  UseAsyncStateEventSubscribe
} from "./types.internal";
import {
  AbortFn,
  LibraryPoolsContext,
  PoolInterface,
  Producer,
  ProducerConfig,
  Source,
  State,
  StateInterface
} from "../types";
import {AsyncState, readSource,} from "../AsyncState";

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
import {__DEV__, emptyArray, isFunction, nextKey,} from "../utils";
import {error} from "../enums";
import {isSource} from "../helpers/isSource";
import {freeze, isArray} from "../helpers/corejs";
import {mapFlags} from "../helpers/mapFlags";

export function resolveFlags<T, E, R, A extends unknown[], S>(
  mixedConfig: MixedConfig<T, E, R, A, S>,
  pool: PoolInterface,
  overrides?: PartialUseAsyncStateConfiguration<T, E, R, A, S>,
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
      let baseConfig = mixedConfig as BaseConfig<T, E, R, A>;
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
    let flags = NO_MODE;
    if (events) {
      if (events.change) {
        flags |= CHANGE_EVENTS;
      }
      if (events.subscribe) {
        flags |= SUBSCRIBE_EVENTS;
      }
    }
    return flags;
  },
  "lazy": (lazy) => lazy === false ? AUTO_RUN : NO_MODE,
});

function getConfigFlags<T, E, R, A extends unknown[], S>(
  config?: PartialUseAsyncStateConfiguration<T, E, R, A, S>
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


export function resolveInstance<T, E, R, A extends unknown[], S>(
  pool: PoolInterface,
  flags: number,
  config: MixedConfig<T, E, R, A, S>,
  overrides?: PartialUseAsyncStateConfiguration<T, E, R, A, S>
): StateInterface<T, E, R, A> | null {
  if (flags & WAIT) {
    return null;
  }

  if (flags & SOURCE) {
    return resolveSourceInstance<T, E, R, A, S>(flags, config, overrides);
  }

  return resolveStandaloneInstance<T, E, R, A, S>(pool, flags, config, overrides);
}


function resolveSourceInstance<T, E, R, A extends unknown[], S>(
  flags: number,
  config: MixedConfig<T, E, R, A, S>,
  overrides?: PartialUseAsyncStateConfiguration<T, E, R, A, S>
) {
  if (flags & CONFIG_SOURCE) {
    let instance = readSource(config as Source<T, E, R, A>);
    if (flags & FORK) {
      instance = instance.fork();
    }
    if (flags & LANE) { // config is a source, so ofc doesn't contain lane prop
      let laneKey = overrides?.lane;
      instance = instance.getLane(laneKey);
    }
    return instance;
  }

  let givenConfig = config as BaseConfig<T, E, R, A>;
  let instance = readSource(givenConfig.source!);
  if (flags & FORK) {
    instance = instance.fork(givenConfig.forkConfig);
  }
  if (flags & LANE) {
    let laneKey = (config as BaseConfig<T, E, R, A>).lane || overrides?.lane;
    return instance.getLane(laneKey)
  }
  return instance;
}

function resolveStandaloneInstance<T, E, R, A extends unknown[], S>(
  pool: PoolInterface,
  flags: number,
  config: MixedConfig<T, E, R, A, S>,
  overrides?: PartialUseAsyncStateConfiguration<T, E, R, A, S>
): StateInterface<T, E, R, A> {
  let key = readKeyFromConfig(flags, config, null);
  let producer = readProducerFromConfig(flags, config);
  let producerConfig = readProducerConfigFromConfig(flags, config);

  let prevInstance = pool.instances.get(key) as StateInterface<T, E, R, A>;

  if (prevInstance) {

    let instance = prevInstance;
    if (flags & FORK) {
      instance = instance.fork((config as BaseConfig<T, E, R, A>).forkConfig);
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

  let instance: StateInterface<T, E, R, A> = new AsyncState(
    key, producer, Object.assign({}, producerConfig, {
      context: pool.context.context,
      pool: pool.simpleName
    }));

  if (flags & LANE) {
    let lane = readLaneFromConfig(config, overrides);
    instance = instance.getLane(lane);
  }

  return instance;
}

function readKeyFromConfig<T, E, R, A extends unknown[], S>(
  flags: number,
  config: MixedConfig<T, E, R, A, S>,
  prevInstance: StateInterface<T, E, R, A> | null
): string {
  if (flags & CONFIG_STRING) {
    return config as string;
  }

  if (flags & CONFIG_OBJECT && (config as BaseConfig<T, E, R, A>).key) {
    return (config as BaseConfig<T, E, R, A>).key!;
  }

  if (!prevInstance) {
    return nextKey();
  }

  return prevInstance.key;
}


function readProducerFromConfig<T, E, R, A extends unknown[]>(
  flags: number,
  config: MixedConfig<T, E, R, A>,
): Producer<T, E, R, A> | undefined {
  if (flags & CONFIG_FUNCTION) {
    return config as Producer<T, E, R, A>;
  }

  if (flags & CONFIG_OBJECT) {
    return (config as BaseConfig<T, E, R, A>).producer;
  }

  return undefined;
}

function readProducerConfigFromConfig<T, E, R, A extends unknown[], S>(
  flags: number,
  config: MixedConfig<T, E, R, A, S>,
): ProducerConfig<T, E, R, A> | undefined {
  if (flags & CONFIG_FUNCTION) {
    return undefined;
  }

  if ((flags & CONFIG_OBJECT) && !(flags & SOURCE)) {
    return (config as BaseConfig<T, E, R, A>);
  }

  return undefined;
}


function readLaneFromConfig<T, E, R, A extends unknown[], S>(
  config: MixedConfig<T, E, R, A, S>,
  overrides?: PartialUseAsyncStateConfiguration<T, E, R, A, S>
): string | undefined {
  if (overrides && overrides.lane) {
    return overrides.lane;
  }

  return (config as BaseConfig<T, E, R, A>).lane;
}


function makeBaseReturn<T, E, R, A extends unknown[], S>(
  flags: number,
  config: MixedConfig<T, E, R, A, S>,
  instance: StateInterface<T, E, R, A> | null,
) {
  if (!instance) {
    let key = flags & CONFIG_STRING ? config : (config as BaseConfig<T, E, R, A>).key;
    let output = {key, flags} as BaseUseAsyncState<T, E, R, A, S>;
    if (__DEV__) {
      output.devFlags = mapFlags(flags);
    }
    return output;
  }

  let output = Object.assign({}, instance._source, {
      flags,
      source: instance._source
    }
  ) as BaseUseAsyncState<T, E, R, A, S>;

  if (__DEV__) {
    output.devFlags = mapFlags(flags);
  }
  return output;
}


function calculateSubscriptionKey<T, E, R, A extends unknown[], S>(
  flags: number,
  config: MixedConfig<T, E, R, A, S>,
  callerName: string | undefined,
  stateInterface: StateInterface<T, E, R, A> | null,
): string | undefined {
  if (flags & CONFIG_OBJECT && (config as BaseConfig<T, E, R, A>).subscriptionKey) {
    return (config as BaseConfig<T, E, R, A>).subscriptionKey;
  }
  if (flags & WAIT || !stateInterface) {
    return;
  }
  if (__DEV__) {
    let instance = stateInterface as AsyncState<T, E, R, A>;
    if (instance.subsIndex === undefined) {
      instance.subsIndex = 0;
    }
    let index = ++instance.subsIndex;
    return `${callerName}-${index}`;
  }
}


export function hookReturn<T, E, R, A extends unknown[], S>(
  flags: number,
  config: MixedConfig<T, E, R, A, S>,
  base: BaseUseAsyncState<T, E, R, A, S>,
  instance: StateInterface<T, E, R, A> | null,
): Readonly<UseAsyncState<T, E, R, A, S>> {
  const newState = Object.assign({}, base) as UseAsyncState<T, E, R, A, S>;
  const newValue = readStateFromInstance(instance, flags, config);
  if (instance) {
    newState.version = instance?.version;
    newState.lastSuccess = instance.lastSuccess;
    newState.read = createReadInConcurrentMode(instance, newValue, config);
  }
  newState.state = newValue;

  return freeze(newState);
}

export function createReadInConcurrentMode<T, E, R, A extends unknown[], S>(
  instance: StateInterface<T, E, R, A>,
  stateValue: S,
  config: MixedConfig<T, E, R, A, S>,
) {
  return function (
    suspend: 'initial' | 'pending'| 'both' | true | false = true,
    throwError: boolean = true,
  ) {
    let {state: {status}, promise} = instance;
    let isInitial = status === 'initial'
    let isPending = status === 'pending'

    if (suspend) {
      if (
        (suspend === 'initial' || suspend === "both") &&
        status === "initial"
      ) {
        let args = (typeof config === "object" ?
          (config as BaseConfig<T, E, R, A>).autoRunArgs : emptyArray) as A
        throw instance.runp.apply(null, args);
      }
      if (
        (suspend === "both" || suspend === true || suspend === 'pending') &&
        status === suspend
      ) {
        throw instance.promise;
      }
    }
    if (throwError && error === instance.state.status) {
      throw instance.state.data;
    }
    return stateValue;
  }
}

function invokeSubscribeEvents<T, E, R, A extends unknown[]>(
  events: UseAsyncStateEventSubscribe<T, E, R, A> | undefined,
  run: (...args: A) => AbortFn<R>,
  instance?: StateInterface<T, E, R, A>,
): CleanupFn[] | null {
  if (!events || !instance) {
    return null;
  }

  let eventProps: SubscribeEventProps<T, E, R, A> = instance._source;

  let handlers: ((props: SubscribeEventProps<T, E, R, A>) => CleanupFn)[]
    = isArray(events) ? events : [events];

  return handlers.map(handler => handler(eventProps));
}

function invokeChangeEvents<T, E, R, A extends unknown[]>(
  instance: StateInterface<T, E, R, A>,
  events: UseAsyncStateEventFn<T, E, R, A> | UseAsyncStateEventFn<T, E, R, A>[]
) {
  let nextState = instance.state;
  const changeHandlers: UseAsyncStateEventFn<T, E, R, A>[]
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


export function readStateFromInstance<T, E, R, A extends unknown[], S = State<T, E, R, A>>(
  asyncState: StateInterface<T, E, R, A> | null,
  flags: number,
  config: MixedConfig<T, E, R, A, S>
): S {
  if (!asyncState) {
    return undefined as S;
  }
  const selector = flags & SELECTOR
    ? (config as PartialUseAsyncStateConfiguration<T, E, R, A, S>).selector!
    :
    (<K>(obj): K => obj);
  return selector(asyncState.state, asyncState.lastSuccess, asyncState.cache || null);
}

export type HookChangeEvents<T, E, R, A extends unknown[]> =
  UseAsyncStateEventFn<T, E, R, A>
  | UseAsyncStateEventFn<T, E, R, A>[];

export interface HookOwnState<T, E, R, A extends unknown[], S> {
  context: LibraryPoolsContext,
  guard: number,
  pool: PoolInterface,
  config: MixedConfig<T, E, R, A, S>,
  return: UseAsyncState<T, E, R, A, S>,
  base: BaseUseAsyncState<T, E, R, A, S>,
  deps: unknown[],
  subKey: string | undefined,
  flags: number,
  instance: StateInterface<T, E, R, A> | null,
  renderInfo: {
    current: S,
    version: number | undefined,
  },

  getEvents(): {
    change: HookChangeEvents<T, E, R, A> | undefined,
    sub: UseAsyncStateEventSubscribe<T, E, R, A> | undefined
  },

  subscribeEffect(
    updateState: () => void,
    setGuard: ((updater: ((prev: number) => number)) => void),
  ): CleanupFn,
}

export function subscribeEffect<T, E, R, A extends unknown[], S>(
  hookState: HookOwnState<T, E, R, A, S>,
  updateState: () => void,
  setGuard: ((updater: ((prev: number) => number)) => void),
): CleanupFn {
  let {flags, config, instance, renderInfo, subKey, pool} = hookState;
  if (flags & WAIT) {
    let key: string = flags & CONFIG_STRING
      ? (config as string) : (config as BaseConfig<T, E, R, A>).key!;

    return pool.watch(key, function () {
      setGuard(old => old + 1);
    });
  }

  let didClean = false;
  let cleanups: AbortFn<R>[] = [() => didClean = true];

  function onStateChange() {
    let newSelectedState = readStateFromInstance(instance, flags, config);

    if (flags & EQUALITY_CHECK) {
      let areEqual = (config as PartialUseAsyncStateConfiguration<T, E, R, A, S>)
        .areEqual!(newSelectedState, renderInfo.current);

      if (!areEqual) {
        updateState();
      }
    } else {
      updateState();
    }

    let maybeEvents = hookState.getEvents();
    let maybeChangeEvents = maybeEvents.change;
    if (flags & CHANGE_EVENTS) {
      let changeEvents = (config as BaseConfig<T, E, R, A>).events?.change;
      if (changeEvents) {
        invokeChangeEvents(instance!, changeEvents);
      }
    }
    if (maybeChangeEvents) {
      invokeChangeEvents(instance!, maybeChangeEvents);
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
      (config as BaseConfig<T, E, R, A>).events!.subscribe, instance!.run, instance!);

    if (unsubscribeFns) {
      cleanups = cleanups.concat(unsubscribeFns);
    }
  }

  let maybeSubscriptionEvents = hookState.getEvents().sub;
  if (maybeSubscriptionEvents) {
    let unsubscribeFns = invokeSubscribeEvents(
      maybeSubscriptionEvents, instance!.run, instance!);
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


function resolvePool<T, E, R, A extends unknown[], S>(
  context: LibraryPoolsContext,
  mixedConfig: MixedConfig<T, E, R, A, S>
) {
  let pool = typeof mixedConfig === "object" && (mixedConfig as ProducerConfig<T, E, R, A>).pool;
  return context.getOrCreatePool(pool || "default");
}

export function createHook<T, E, R, A extends unknown[], S>(
  executionContext: LibraryPoolsContext,
  config: MixedConfig<T, E, R, A, S>,
  deps: unknown[],
  guard: number,
  overrides?: PartialUseAsyncStateConfiguration<T, E, R, A, S>,
  caller?: string,
): HookOwnState<T, E, R, A, S> {
  let newPool = resolvePool(executionContext, config);
  let newFlags = resolveFlags(config, newPool, overrides);
  let newInstance = resolveInstance(newPool, newFlags, config, overrides);

  if (!newInstance && !(newFlags & WAIT)) {
    throw new Error("Undefined instance with no WAIT mode. This is a bug.");
  }

  let baseReturn = makeBaseReturn(newFlags, config, newInstance);
  baseReturn.onChange = onChange;
  baseReturn.onSubscribe = onSubscribe;

  let currentReturn = hookReturn(newFlags, config, baseReturn, newInstance);
  let subscriptionKey = calculateSubscriptionKey(newFlags, config, caller, newInstance);

  if (newInstance && newFlags & CONFIG_OBJECT) {
    let configObject = config as BaseConfig<T, E, R, A>;
    if (configObject.payload) {
      newInstance.mergePayload(configObject.payload);
    }
  }

  let changeEvents: HookChangeEvents<T, E, R, A> | undefined = undefined;
  let subscribeEvents: UseAsyncStateEventSubscribe<T, E, R, A> | undefined = undefined;
  // ts complains about subscribeEffect not present, it is assigned later
  // @ts-ignore
  let hook: HookOwnState<T, E, R, A, S> = {
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
      return {
        change: changeEvents,
        sub: subscribeEvents
      };
    },
  };
  // @ts-ignore WTF TS strict!!!
  hook.subscribeEffect = subscribeEffect.bind(null, hook);

  return hook;

  function onChange(
    events: (((prevEvents?: HookChangeEvents<T, E, R, A>) => HookChangeEvents<T, E, R, A>) | HookChangeEvents<T, E, R, A>)
  ) {
    if (isFunction(events)) {
      let maybeEvents = (events as
        (prevEvents?: HookChangeEvents<T, E, R, A>) => HookChangeEvents<T, E, R, A>)(changeEvents);
      if (maybeEvents) {
        changeEvents = maybeEvents;
      }
    } else if (events) {
      changeEvents = (events as HookChangeEvents<T, E, R, A>);
    }
  }

  function onSubscribe(
    events: ((prevEvents?: UseAsyncStateEventSubscribe<T, E, R, A>) => void) | UseAsyncStateEventSubscribe<T, E, R, A>
  ) {
    if (isFunction(events)) {
      let maybeEvents = (events as
        (prevEvents?: UseAsyncStateEventSubscribe<T, E, R, A>) => UseAsyncStateEventSubscribe<T, E, R, A>)(subscribeEvents);
      if (maybeEvents) {
        subscribeEvents = maybeEvents;
      }
    } else if (events) {
      subscribeEvents = (events as UseAsyncStateEventSubscribe<T, E, R, A>);
    }
  }
}

export function autoRun<T, E, R, A extends unknown[], S>(hookState: HookOwnState<T, E, R, A, S>): CleanupFn {
  let {flags, instance, config, base} = hookState;
  // auto run only if condition is met, and it is not lazy
  if (!(flags & AUTO_RUN)) {
    return;
  }
  // if dependencies change, if we run, the cleanup shall abort
  let shouldRun = true;

  if (flags & CONFIG_OBJECT) {
    let configObject = (config as BaseConfig<T, E, R, A>);
    if (isFunction(configObject.condition)) {
      let conditionFn = configObject.condition as
        ((
          state: State<T, E, R, A>, args?: A,
          payload?: Record<string, unknown> | null
        ) => boolean);

      shouldRun = conditionFn(instance!.getState(), configObject.autoRunArgs, instance!.getPayload());
    } else if (configObject.condition === false) {
      shouldRun = false;
    }
  }

  if (shouldRun) {
    if (flags & CONFIG_OBJECT && (config as BaseConfig<T, E, R, A>).autoRunArgs) {
      let {autoRunArgs} = (config as BaseConfig<T, E, R, A>);
      if (autoRunArgs && isArray(autoRunArgs)) {
        return base.run.apply(null, autoRunArgs);
      }
    }

    return base.run.apply(null);
  }
}
