import AsyncState, {
  AbortFn,
  AsyncStateKeyOrSource,
  CachedState,
  Producer,
  ProducerConfig,
  ProducerEffects,
  ProducerProps,
  ProducerRunConfig,
  ProducerRunInput,
  Source,
  State,
  StateInterface,
  readInstanceFromSource,
  runWhileSubscribingToNextResolve,
  standaloneProducerRunEffectFunction,
  standaloneProducerRunpEffectFunction,
  standaloneProducerSelectEffectFunction
} from "./AsyncState";

import {isAsyncStateSource,} from "./utils";

const listenersKey = Symbol();

// the manager contains all functions responsible for managing the context provider
// there is a manager per provider
// the manager operates on the asyncStateEntries map after copying the oldManager watchers
export function AsyncStateManager(
  initializer?: InitialStates
): AsyncStateManagerInterface {

  let asyncStateEntries: AsyncStateEntries = Object
    .values(initializer ?? {})
    .reduce(
      createInitialAsyncStatesReducer,
      Object.create(null)
    ) as AsyncStateEntries;

  let payload: Record<string, any> = {};
  // stores all listeners/watchers about an async state
  let watchers: ManagerWatchers = Object.create(null);

  // @ts-ignore
  // ts is yelling at producerEffectsCreator property which will be assigned
  // in the next statement.
  const output: AsyncStateManagerInterface = {
    entries: asyncStateEntries,
    run,
    get,
    hoist,
    watch,
    dispose,
    watchers,
    watchAll,
    getAllKeys,
    notifyWatchers,
    setInitialStates,
    getPayload(): Record<string, any> {
      return payload;
    },
    mergePayload(partialPayload: Record<string, any>): void {
      Object.assign(payload, partialPayload);
    }
  };
  output.producerEffectsCreator = createProducerEffectsCreator(output);

  return output;

  function getInitialStatesMap(initialStates?: InitialStates) {
    const values = Object.values(initialStates ?? {});

    return values.reduce((acc, current) => {
      acc[current.key] = current;
      return acc;
    }, {} as Record<string, ExtendedInitialAsyncState<any>>);
  }

  function setInitialStates(initialStates?: InitialStates): AsyncStateEntry<any>[] {
    const newStatesMap = getInitialStatesMap(initialStates);

    const previousStates = {...asyncStateEntries};
    // basically, this is the same object reference...
    asyncStateEntries = Object
      .values(newStatesMap)
      .reduce(
        createInitialAsyncStatesReducer,
        asyncStateEntries,
      );

    // we should remove the states that were initially hoisted
    // but do no-longer exist in provider.
    // these states should not exist unless there is a subscriber to them
    // in this case, we should mark them as not initially hoisted
    const entriesToRemove: AsyncStateEntry<any>[] = [];
    for (const [key, entry] of Object.entries(asyncStateEntries)) {
      // notify only if new!
      if (newStatesMap[key] && !previousStates[key]) {
        notifyWatchers(key, entry.instance);
      }
      if (!newStatesMap[key] && entry.hoisted) {
        entry.hoisted = false;
        entriesToRemove.push(entry);
      }
    }

    return entriesToRemove;
  }

  function get<T>(
    key: string
  ): StateInterface<T> {
    return asyncStateEntries[key]?.instance;
  }

  function run<T>(
    asyncState: StateInterface<T>,
    ...args: any[]
  ): AbortFn {
    return asyncState.run(output.producerEffectsCreator, ...args);
  }

  function dispose<T>(
    asyncState: StateInterface<T>
  ): boolean {
    const {key} = asyncState;

    // delete only if it was not initially hoisted
    const entry = asyncStateEntries[key]
    if (
      entry &&
      !entry.hoisted &&
      entry.instance.subscriptions &&
      Object.values(entry.instance.subscriptions).length === 0
    ) {
      delete asyncStateEntries[key];
      // notify watchers about disappearance
      notifyWatchers(key, null);

      return true;
    }

    return false;
  }

  // there is two types of watchers: per key, and watching everything
  // the everything watcher is the useSelector with a function selecting keys
  // (cannot statically predict them, so it needs to be notified about everything happening)
  // watch: watches only a key
  // watchAll: watches everything and uses a special key to watch (a symbol)
  // watchers have this shape
  // {
  //    listenersKey(symbol): { // watching everything
  //      meter: 3,
  //      watchers: {
  //        1: {notify, cleanup}
  //        2: {notify, cleanup}
  //        3: {notify, cleanup}
  //      }
  //    },
  //    users: {
  //      meter: 1,
  //      watchers: {
  //        1: {notify, cleanup}
  //      }
  //    }
  // }
  function watch<T>(
    key: AsyncStateWatchKey,
    notify: ManagerWatchCallback<T>
  ): AbortFn {
    if (!watchers[key]) {
      watchers[key] = {meter: 0, watchers: {}};
    }

    // these are the watchers about the specified key
    let keyWatchers = watchers[key];
    const index = ++keyWatchers.meter;

    let didUnwatch = false;

    function notification(
      argv: ManagerWatchCallbackValue<T>,
      notificationKey: string
    ) {
      if (!didUnwatch) {
        notify(
          argv,
          notificationKey
        );
      }
    }

    keyWatchers.watchers[index] = {notify: notification, cleanup};

    function cleanup() {
      didUnwatch = true;
      delete keyWatchers.watchers[index];
    }

    return cleanup;
  }

  function watchAll(notify: ManagerWatchCallback<any>) {
    return watch(listenersKey, notify);
  }

  function notifyWatchers<T>(
    key: string,
    value: ManagerWatchCallbackValue<T>
  ): void {
    function notify() {
      // it is important to close over the notifications to be sent
      // to avoid sending notifications to old closures that aren't relevant anymore
      // if this occurs, the component will receive a false notification
      // that may let him enter an infinite loop
      let notifications: WatcherType[] = [];

      if (watchers[listenersKey]?.watchers) {
        notifications = Object.values(watchers[listenersKey].watchers);
      }
      if (watchers[key]) {
        notifications = notifications.concat(
          Object.values(watchers[key].watchers));
      }

      notifications.forEach(function notifyWatcher(watcher) {
        watcher.notify(value, key);
      });
    }

    // the notification should not go synchronous
    // because it occurs when a component A is rendering,
    // if we notify a component B that schedules a render
    // react would throw a warning in the console about scheduling
    // an update in a component in the render phase from another one
    Promise.resolve().then(notify);
  }

  function hoist<T>(
    key: string,
    instance: StateInterface<T>,
    hoistConfig?: HoistToProviderConfig
  ): StateInterface<T> {

    const existing = get(key);

    if (existing && !hoistConfig?.override) {
      return existing as StateInterface<T>;
    }

    if (existing) {
      let didDispose = dispose(existing);

      if (!didDispose) {
        return existing as StateInterface<T>;
      }
    }

    asyncStateEntries[key] = createAsyncStateEntry(instance, false);

    notifyWatchers(key, instance); // this is async

    return instance;
  }

  // used in function selector in useSelector
  function getAllKeys(): string[] {
    return Object.keys(asyncStateEntries);
  }
}

function createAsyncStateEntry<T>(
  asyncState: StateInterface<T>,
  initiallyHoisted: boolean,
): AsyncStateEntry<T> {
  return {instance: asyncState, hoisted: initiallyHoisted};
}


function createInitialAsyncStatesReducer(
  result: AsyncStateEntries,
  current: ExtendedInitialAsyncState<any>
): AsyncStateEntries {
  if (isAsyncStateSource(current)) {
    const key = current.key;
    const existingEntry = result[key];
    const asyncState = readInstanceFromSource(
      current as Source<any>);

    if (!existingEntry || asyncState !== existingEntry.instance) {
      result[key] = createAsyncStateEntry(asyncState, true);
      result[key].hoisted = true;
    }

    return result;
  } else {
    const {key, producer, config} = current as InitialAsyncState<any>;
    const initialValue = config?.initialValue;
    const existingEntry = result[key];

    if (existingEntry) {
      const asyncState = existingEntry.instance;
      if (
        asyncState.originalProducer === producer &&
        asyncState.config.initialValue === initialValue
      ) {
        return result;
      }
    }
    result[key] = createAsyncStateEntry(
      new AsyncState(key, producer, config),
      true // initially hoisted
    );
    result[key].hoisted = true;

    return result;
  }
}

//region Producer effects creator

export function createProducerEffectsCreator(manager: AsyncStateManagerInterface) {
  return function closeOverProps<T>(props: ProducerProps<T>): ProducerEffects {
    return {
      run: managerProducerRunFunction.bind(null, manager),
      select: managerProducerSelectFunction.bind(null, manager),
      runp: managerProducerRunpFunction.bind(null, manager, props),
    };
  }
}

function managerProducerRunFunction<T>(
  manager: AsyncStateManagerInterface,
  input: ProducerRunInput<T>,
  config: ProducerRunConfig | null,
  ...args: any[]
): AbortFn {
  if (typeof input === "string") {
    let instance = manager.get(input);
    if (!instance) {
      return;
    }
    if (config?.lane) {
      instance = instance.getLane(config.lane);
    }
    return instance.run(manager.producerEffectsCreator, ...args);
  }
  return standaloneProducerRunEffectFunction(input, config, ...args);
}

function managerProducerRunpFunction<T>(
  manager: AsyncStateManagerInterface,
  props: ProducerProps<T>,
  input: ProducerRunInput<T>,
  config: ProducerRunConfig | null,
  ...args: any[]
): Promise<State<T>> | undefined {
  if (typeof input === "string") {
    let instance = manager.get<T>(input);
    if (!instance) {
      return;
    }
    if (config?.lane) {
      instance = instance.getLane(config.lane);
    }
    return runWhileSubscribingToNextResolve(instance, props, args);
  }
  return standaloneProducerRunpEffectFunction(props, input, config, ...args);
}

function managerProducerSelectFunction<T>(
  manager: AsyncStateManagerInterface,
  input: AsyncStateKeyOrSource<T>,
  lane?: string,
): State<T> | undefined {
  if (typeof input === "string") {
    let instance = manager.get<T>(input);
    if (!instance) {
      return;
    }
    if (lane) {
      instance = instance.getLane(lane);
    }
    return instance.getState();
  }
  return standaloneProducerSelectEffectFunction(input, lane);
}

//endregion

//region TYPES
export type HoistToProviderConfig = {
  override: boolean,
}

export type ManagerWatchCallbackValue<T> = StateInterface<T> | null;

export type ManagerWatchCallback<T> = (
  value: ManagerWatchCallbackValue<T>,
  additionalInfo: string
) => void;

export type WatcherType = {
  cleanup: AbortFn,
  notify: ManagerWatchCallback<any>,
}

export type ManagerWatchers = {
  meter: number,
  watchers: {
    [id: string | symbol]: WatcherType
  }
}

export type AsyncStateManagerInterface = {
  entries: AsyncStateEntries,
  watchers: ManagerWatchers,
  run<T>(
    asyncState: StateInterface<T>,
    ...args: any[]
  ): AbortFn,
  get<T>(key: string): StateInterface<T>,
  hoist<T>(
    key: string, instance: StateInterface<T>,
    hoistConfig?: HoistToProviderConfig
  ): StateInterface<T>,
  dispose<T>(asyncState: StateInterface<T>): boolean,
  watch<T>(
    key: AsyncStateWatchKey,
    value: ManagerWatchCallback<T>
  ): AbortFn,
  notifyWatchers<T>(
    key: string,
    value: ManagerWatchCallbackValue<T>
  ): void,
  getAllKeys(): string[],
  watchAll(cb: ManagerWatchCallback<any>),
  setInitialStates(initialStates?: InitialStates): AsyncStateEntry<any>[],

  getPayload(): Record<string, any>,
  mergePayload(partialPayload?: Record<string, any>): void,

  producerEffectsCreator<T>(props: ProducerProps<T>): ProducerEffects,
}

export type InitialStatesObject = { [id: string]: ExtendedInitialAsyncState<any> };

export type InitialStates = ExtendedInitialAsyncState<any>[]
  | InitialStatesObject;

export type StateProviderProps = {
  manager?: AsyncStateManagerInterface,
  children: any,
  initialStates?: InitialStates,
  payload?: { [id: string]: any },
}


export type AsyncStateEntry<T> = {
  hoisted: boolean,
  instance: StateInterface<T>,
}

export type AsyncStateEntries = Record<string, AsyncStateEntry<any>>

export type AsyncStateSelector<T> =
  SimpleSelector<any, T>
  | ArraySelector<T>
  | FunctionSelector<T>;

export type SimpleSelector<T, E> = (props: FunctionSelectorItem<T> | undefined) => E;
export type ArraySelector<T> = (...states: (FunctionSelectorItem<any> | undefined)[]) => T;

export type ExtendedInitialAsyncState<T> =
  InitialAsyncState<T>
  | Source<T>;

export type InitialAsyncState<T> = {
  key: string,
  producer?: Producer<T>,
  config?: ProducerConfig<T>
}
export type AsyncStateWatchKey = string | symbol;

export type FunctionSelector<T> = (arg: FunctionSelectorArgument) => T;
export type FunctionSelectorArgument = Record<string, FunctionSelectorItem<any> | undefined>;

export interface FunctionSelectorItem<T> extends Partial<State<T>> {
  key: string,
  lastSuccess?: State<T>,
  cache?: Record<string, CachedState<T>> | null,
}

//endregion
