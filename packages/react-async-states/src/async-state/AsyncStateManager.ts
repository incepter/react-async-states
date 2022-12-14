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
  standaloneProducerSelectEffectFunction,
  InitialState,
  PendingState,
  AbortedState, SuccessState, ErrorState, LastSuccessSavedState
} from "./AsyncState";

import {isSource,} from "./utils";

const listenersKey = Symbol();

export function AsyncStateManager(initializer?: InitialStates): ManagerInterface {

  let asyncStateEntries = Object
    .values(initializer || {}).reduce(stateEntriesReducer, {});

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

  function get<T, E, R>(key: string): StateInterface<T, E, R> {
    return asyncStateEntries[key]?.instance;
  }

  function watchAll(notify: WatchCallback<any, any, any>) {
    return watch(listenersKey, notify);
  }

  function getAllKeys(): string[] {
    return Object.keys(asyncStateEntries);
  }

  function hoist<T, E, R>(
    key: string, instance: StateInterface<T, E, R>, hoistConfig?: hoistConfig
  ): StateInterface<T, E, R> {
    let prevInstance = get<T, E, R>(key);
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

  function watch<T, E, R>(key: AsyncStateWatchKey, notify: WatchCallback<T, E, R>): AbortFn {
    let keyWatchers = watchers[key];
    if (!keyWatchers) {
      keyWatchers = watchers[key] = {meter: 0, watchers: {}};
    }
    let didUnwatch = false;
    let index = ++keyWatchers.meter;
    keyWatchers.watchers[index] = {notify: notification, cleanup};
    return cleanup;

    function notification(argv: InstanceOrNull<T, E, R>, notifKey: string) {
      if (!didUnwatch) {
        notify(argv, notifKey);
      }
    }
    function cleanup() {
      didUnwatch = true;
      delete keyWatchers.watchers[index];
    }
  }

  function dispose<T, E, R>(asyncState: StateInterface<T, E, R>): boolean {
    let {key} = asyncState;
    let maybeEntry = asyncStateEntries[key];
    if (!maybeEntry || maybeEntry.instance !== asyncState) {
      return false;
    }

    if (
      !maybeEntry.hoisted &&
      (!maybeEntry.instance.subscriptions || maybeEntry.instance.subscriptions &&
      Object.values(maybeEntry.instance.subscriptions).length === 0)
    ) {
      delete asyncStateEntries[key];
      notifyWatchers(key, null);
      return true;
    }

    return false;
  }


  function setInitialStates(initialStates?: InitialStates): StateEntry<any, any, any>[] {
    let newEntries = getInitialStatesMap(initialStates);
    let previousEntries = Object.assign({}, asyncStateEntries);
    // basically, this is the same object reference..
    asyncStateEntries = Object
      .values(newEntries)
      .reduce(stateEntriesReducer, asyncStateEntries);

    let entriesToRemove: StateEntry<any, any, any>[] = [];
    for (const [key, entry] of Object.entries(asyncStateEntries)) {
      if (newEntries[key] && !previousEntries[key]) { // notify only if new
        notifyWatchers(key, entry.instance);
      }
      if (!newEntries[key] && entry.hoisted) {
        entry.hoisted = false;
        entriesToRemove.push(entry);
      }
    }

    return entriesToRemove;
  }


  function notifyWatchers<T, E, R>(key: string, value: InstanceOrNull<T, E, R>): void {
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

function stateEntriesReducer(
  result: StateEntries,
  current: SourceOrDefinition<any, any, any>
): StateEntries {
  if (isSource(current)) {
    let prevEntry = result[current.key];
    let instance = readSource(current as Source<any, any, any>);
    if (!prevEntry || instance !== prevEntry.instance) {
      result[current.key] = {instance, hoisted: true};
    }
    return result;
  } else {
    let prevEntry = result[current.key];
    if (prevEntry && prevEntry.hoisted) {
      let nextProducer = (current as StateDefinition<any, any, any>).producer;
      if (nextProducer !== prevEntry.instance.originalProducer) {
        prevEntry.instance.replaceProducer(nextProducer);
      }
      return result;
    }
    let {key, producer, config} = current as StateDefinition<any, any, any>;
    let instance = new AsyncState(key, producer, config);
    result[current.key] = {instance, hoisted: true};
    return result;
  }
}

//region Producer effects creator

export function createProducerEffectsCreator(manager: ManagerInterface) {
  return function closeOverProps<T, E, R>(props: ProducerProps<T, E, R>): ProducerEffects {
    return {
      run: managerProducerRunFunction.bind(null, manager),
      select: managerProducerSelectFunction.bind(null, manager),
      runp: managerProducerRunpFunction.bind(null, manager, props),
    };
  }
}

function managerProducerRunFunction<T, E, R>(
  manager: ManagerInterface,
  input: ProducerRunInput<T, E, R>,
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

function managerProducerRunpFunction<T, E, R>(
  manager: ManagerInterface,
  props: ProducerProps<T, E, R>,
  input: ProducerRunInput<T, E, R>,
  config: ProducerRunConfig | null,
  ...args: any[]
): Promise<State<T, E, R>> | undefined {
  if (typeof input === "string") {
    let instance = manager.get<T, E, R>(input);
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

function managerProducerSelectFunction<T, E, R>(
  manager: ManagerInterface,
  input: AsyncStateKeyOrSource<T, E, R>,
  lane?: string,
): State<T, E, R> | undefined {
  if (typeof input === "string") {
    let instance = manager.get<T, E, R>(input);
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
  }, {} as Record<string, SourceOrDefinition<any, any, any>>);
}

//endregion

//region TYPES
export type hoistConfig = {
  override: boolean,
}

export type InstanceOrNull<T, E, R> = StateInterface<T, E, R> | null;

export type WatchCallback<T, E, R> = (value: InstanceOrNull<T, E, R>, key: string) => void;

export type WatcherType = { cleanup: AbortFn, notify: WatchCallback<any, any, any> }

export type ManagerWatchers = {
  meter: number,
  watchers: {
    [id: string | symbol]: WatcherType
  }
}

export interface ManagerInterface {
  entries: StateEntries,
  watchers: ManagerWatchers,
  get<T, E, R>(key: string): StateInterface<T, E, R>,
  hoist<T, E, R>(
    key: string, instance: StateInterface<T, E, R>,
    hoistConfig?: hoistConfig
  ): StateInterface<T, E, R>,
  dispose<T, E, R>(asyncState: StateInterface<T, E, R>): boolean,
  watch<T, E, R>(
    key: AsyncStateWatchKey,
    value: WatchCallback<T, E, R>
  ): AbortFn,
  notifyWatchers<T, E, R>(
    key: string,
    value: InstanceOrNull<T, E, R>
  ): void,
  getAllKeys(): string[],
  watchAll(cb: WatchCallback<any, any, any>),
  setStates(initialStates?: InitialStates): StateEntry<any, any, any>[],

  getPayload(): Record<string, any> | null,
  mergePayload(partialPayload?: Record<string, any>): void,

  createEffects<T, E, R>(props: ProducerProps<T, E, R>): ProducerEffects,
}

export type SourceOrDefinition<T, E, R> = Source<T, E, R> | StateDefinition<T, E, R>;

export type InitialStates = SourceOrDefinition<any, any, any>[] | Record<string, SourceOrDefinition<any, any, any>>;

export type StateProviderProps = {
  children: any,
  manager?: ManagerInterface,
  initialStates?: InitialStates,
  payload?: Record<string, any>,
}


export type StateEntry<T, E, R> = {
  hoisted: boolean,
  instance: StateInterface<T, E, R>,
}

export type StateEntries = Record<string, StateEntry<any, any, any>>

export type SimpleSelector<T, E, R, D> = (props: FunctionSelectorItem<T, E, R> | undefined) => D;
export type ArraySelector<T> = (...states: (FunctionSelectorItem<any, any, any> | undefined)[]) => T;


export type StateDefinition<T, E, R> = {
  key: string,
  producer?: Producer<T, E, R>,
  config?: ProducerConfig<T, E, R>
}
export type AsyncStateWatchKey = string | symbol;

export type FunctionSelector<T> = (arg: FunctionSelectorArgument) => T;
export type FunctionSelectorArgument = Record<string, FunctionSelectorItem<any, any, any> | undefined>;

export interface InitialFunctionSelectorItem<T, E, R> extends Partial<InitialState<T>> {
  key: string,
  lastSuccess?: LastSuccessSavedState<T>,
  cache?: Record<string, CachedState<T, E, R>> | null,
}

export interface PendingFunctionSelectorItem<T, E, R> extends Partial<PendingState<T>> {
  key: string,
  lastSuccess?: LastSuccessSavedState<T>,
  cache?: Record<string, CachedState<T, E, R>> | null,
}

export interface AbortedFunctionSelectorItem<T, E, R> extends Partial<AbortedState<T, E, R>> {
  key: string,
  lastSuccess?: LastSuccessSavedState<T>,
  cache?: Record<string, CachedState<T, E, R>> | null,
}

export interface SuccessFunctionSelectorItem<T, E, R> extends Partial<SuccessState<T>> {
  key: string,
  lastSuccess?: LastSuccessSavedState<T>,
  cache?: Record<string, CachedState<T, E, R>> | null,
}

export interface ErrorFunctionSelectorItem<T, E, R> extends Partial<ErrorState<T, E>> {
  key: string,
  lastSuccess?: LastSuccessSavedState<T>,
  cache?: Record<string, CachedState<T, E, R>> | null,
}

export type FunctionSelectorItem<T, E, R> = InitialFunctionSelectorItem<T, E, R> |
  PendingFunctionSelectorItem<T, E, R> |
  AbortedFunctionSelectorItem<T, E, R> |
  SuccessFunctionSelectorItem<T, E, R> |
  ErrorFunctionSelectorItem<T, E, R>;

//endregion
