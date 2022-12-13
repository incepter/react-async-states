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
  readSource,
  runWhileSubscribingToNextResolve,
  standaloneProducerRunEffectFunction,
  standaloneProducerRunpEffectFunction,
  standaloneProducerSelectEffectFunction
} from "./AsyncState";

import {isSource,} from "./utils";

const listenersKey = Symbol();

export function AsyncStateManager(initializer?: InitialStates): ManagerInterface {

  let asyncStateEntries = Object
    .values(initializer || {}).reduce(createStateEntriesReducer, {});

  let payload: Record<string, any> | null = null;
  let watchers: ManagerWatchers = Object.create(null);

  // @ts-ignore ts wants createEffects property that is assigned right next
  const output: ManagerInterface = {
    get,
    hoist,
    watch,
    dispose,
    watchers,
    watchAll,
    getAllKeys,
    notifyWatchers,
    entries: asyncStateEntries,
    setStates: setInitialStates,
    getPayload(): Record<string, any> | null {
      return payload;
    },
    mergePayload(partialPayload: Record<string, any>): void {
      if (!payload) {
        payload = {};
      }
      Object.assign(payload, partialPayload);

      for (const entry of Object.values(asyncStateEntries)) {
        entry.instance.mergePayload(partialPayload);
      }
    }
  };
  output.createEffects = createProducerEffectsCreator(output);

  return output;

  function get<T>(key: string): StateInterface<T> {
    return asyncStateEntries[key]?.instance;
  }

  function watchAll(notify: WatchCallback<any>) {
    return watch(listenersKey, notify);
  }

  function getAllKeys(): string[] {
    return Object.keys(asyncStateEntries);
  }

  function hoist<T>(
    key: string, instance: StateInterface<T>, hoistConfig?: hoistConfig
  ): StateInterface<T> {
    let prevInstance = get<T>(key);
    if (prevInstance && !hoistConfig?.override) {
      return prevInstance;
    }
    if (prevInstance) {
      let didDispose = dispose(prevInstance);
      if (!didDispose) { // something is subscribing to it
        return prevInstance;
      }
    }
    asyncStateEntries[key] = {instance, hoisted: false};
    notifyWatchers(key, instance);
    return instance;
  }

  function watch<T>(key: AsyncStateWatchKey, notify: WatchCallback<T>): AbortFn {
    let keyWatchers = watchers[key];
    if (!keyWatchers) {
      keyWatchers = watchers[key] = {meter: 0, watchers: {}};
    }
    let didUnwatch = false;
    let index = ++keyWatchers.meter;
    keyWatchers.watchers[index] = {notify: notification, cleanup};
    return cleanup;

    function notification(argv: ManagerWatchCallbackValue<T>, notifKey: string) {
      if (!didUnwatch) {
        notify(argv, notifKey);
      }
    }
    function cleanup() {
      didUnwatch = true;
      delete keyWatchers.watchers[index];
    }
  }

  function dispose<T>(asyncState: StateInterface<T>): boolean {
    let {key} = asyncState;
    let maybeEntry = asyncStateEntries[key];
    if (!maybeEntry || maybeEntry.instance !== asyncState) {
      return false;
    }

    if (
      !maybeEntry.hoisted && maybeEntry.instance.subscriptions &&
      Object.values(maybeEntry.instance.subscriptions).length === 0
    ) {
      delete asyncStateEntries[key];
      notifyWatchers(key, null);
      return true;
    }

    return false;
  }


  function setInitialStates(initialStates?: InitialStates): AsyncStateEntry<any>[] {
    let newStatesMap = getInitialStatesMap(initialStates);

    let previousStates = Object.assign({}, asyncStateEntries);
    // basically, this is the same object reference..
    asyncStateEntries = Object
      .values(newStatesMap)
      .reduce(createStateEntriesReducer, asyncStateEntries);

    let entriesToRemove: AsyncStateEntry<any>[] = [];
    for (const [key, entry] of Object.entries(asyncStateEntries)) {
      if (newStatesMap[key] && !previousStates[key]) { // notify only if new
        notifyWatchers(key, entry.instance);
      }
      if (!newStatesMap[key] && entry.hoisted) {
        entry.hoisted = false;
        entriesToRemove.push(entry);
      }
    }

    return entriesToRemove;
  }


  function notifyWatchers<T>(
    key: string,
    value: ManagerWatchCallbackValue<T>
  ): void {
    Promise.resolve().then(function notify() {
      let notifications: WatcherType[] = [];
      if (watchers[listenersKey]?.watchers) {
        notifications = Object.values(watchers[listenersKey].watchers);
      }
      if (watchers[key]) {
        notifications = notifications.concat(Object.values(watchers[key].watchers));
      }
      notifications.forEach(function notifyWatcher(watcher) {
        watcher.notify(value, key);
      });
    });
  }

}

function createStateEntriesReducer(
  result: AsyncStateEntries,
  current: SourceOrDefinition<any>
): AsyncStateEntries {
  if (isSource(current)) {
    let prevEntry = result[current.key];
    let instance = readSource(current as Source<any>);
    if (!prevEntry || instance !== prevEntry.instance) {
      result[current.key] = {instance, hoisted: true};
    }
    return result;
  } else {
    const prevEntry = result[current.key];
    if (prevEntry && prevEntry.hoisted) {
      let nextProducer = (current as StateDefinition<any>).producer;
      if (nextProducer !== prevEntry.instance.originalProducer) {
        prevEntry.instance.replaceProducer(nextProducer);
      }
      return result;
    }
    let {key, producer, config} = current as StateDefinition<any>;
    let instance = new AsyncState(key, producer, config);
    result[current.key] = {instance, hoisted: true};
    return result;
  }
}

//region Producer effects creator

export function createProducerEffectsCreator(manager: ManagerInterface) {
  return function closeOverProps<T>(props: ProducerProps<T>): ProducerEffects {
    return {
      run: managerProducerRunFunction.bind(null, manager),
      select: managerProducerSelectFunction.bind(null, manager),
      runp: managerProducerRunpFunction.bind(null, manager, props),
    };
  }
}

function managerProducerRunFunction<T>(
  manager: ManagerInterface,
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
    return instance.run(manager.createEffects, ...args);
  }
  return standaloneProducerRunEffectFunction(input, config, ...args);
}

function managerProducerRunpFunction<T>(
  manager: ManagerInterface,
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
  manager: ManagerInterface,
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


function getInitialStatesMap(initialStates?: InitialStates) {
  const values = Object.values(initialStates || {});

  return values.reduce((acc, current) => {
    acc[current.key] = current;
    return acc;
  }, {} as Record<string, SourceOrDefinition<any>>);
}

//endregion

//region TYPES
export type hoistConfig = {
  override: boolean,
}

export type ManagerWatchCallbackValue<T> = StateInterface<T> | null;

export type WatchCallback<T> = (
  value: ManagerWatchCallbackValue<T>,
  additionalInfo: string
) => void;

export type WatcherType = {
  cleanup: AbortFn,
  notify: WatchCallback<any>,
}

export type ManagerWatchers = {
  meter: number,
  watchers: {
    [id: string | symbol]: WatcherType
  }
}

export interface ManagerInterface {
  entries: AsyncStateEntries,
  watchers: ManagerWatchers,
  get<T>(key: string): StateInterface<T>,
  hoist<T>(
    key: string, instance: StateInterface<T>,
    hoistConfig?: hoistConfig
  ): StateInterface<T>,
  dispose<T>(asyncState: StateInterface<T>): boolean,
  watch<T>(
    key: AsyncStateWatchKey,
    value: WatchCallback<T>
  ): AbortFn,
  notifyWatchers<T>(
    key: string,
    value: ManagerWatchCallbackValue<T>
  ): void,
  getAllKeys(): string[],
  watchAll(cb: WatchCallback<any>),
  setStates(initialStates?: InitialStates): AsyncStateEntry<any>[],

  getPayload(): Record<string, any> | null,
  mergePayload(partialPayload?: Record<string, any>): void,

  createEffects<T>(props: ProducerProps<T>): ProducerEffects,
}

export type InitialStatesObject = { [id: string]: SourceOrDefinition<any> };

export type InitialStates = SourceOrDefinition<any>[]
  | InitialStatesObject;

export type StateProviderProps = {
  manager?: ManagerInterface,
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

export type SourceOrDefinition<T> = Source<T> | StateDefinition<T>;

export type StateDefinition<T> = {
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
