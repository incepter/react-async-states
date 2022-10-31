import * as React from "react";
import {AsyncStateContext} from "./context";
import {
  asyncify,
  EMPTY_OBJECT,
  readProducerConfigFromProducerConfig,
  shallowClone,
} from "shared";
import {
  AsyncStateEntries,
  AsyncStateEntry,
  AsyncStateKeyOrSource,
  AsyncStateManagerInterface,
  AsyncStateWatchKey,
  ExtendedInitialAsyncState,
  HoistToProviderConfig,
  InitialAsyncState,
  InitialStates,
  ManagerWatchCallback,
  ManagerWatchCallbackValue,
  ManagerWatchers,
  StateContextValue,
  StateProviderProps,
  UseAsyncStateContextType,
  WatcherType
} from "../types.internal";
import AsyncState, {AbortFn, Source, StateInterface} from "../async-state";
import {isAsyncStateSource} from "../async-state/utils";
import {
  createProducerEffectsCreator,
  readAsyncStateFromSource
} from "../async-state/AsyncState";

// let didWarnAboutProviderDeprecated = false;
/**
 * The provider will be removed in the next stable release
 * don't rely on it as it only causes errors and this part will
 * be delegated completely outside React
 */
export function AsyncStateProvider(
  {
    children,
    payload,
    initialStates
  }: StateProviderProps) {
  // if (__DEV__) {
  //   if (!didWarnAboutProviderDeprecated) {
  //     warning(`[Deprecation Warning] The provider will be deprecated in v2.
  //     Please limit your usage with the provider.\n
  //     There will be no provider and useAsyncState({key: "some-key"}) will just work.
  //     \nThe recommendation for now is to keep the keys unique and don't make
  //     any abstraction assuming there are multiple providers and keys are unique
  //     per provider. For the payload, there will be a global way to set it and it
  //     so all features would remain working.`);
  //     didWarnAboutProviderDeprecated = true;
  //   }
  // }

  // manager per provider
  // this manager lives with the provider and will never change
  // the initialize function creates a mutable manager instance
  const manager = React.useMemo<AsyncStateManagerInterface>(initialize, []);

  // this function should only tell the manager to execute a diffing
  // of items he has and the new ones
  // we need to figure out a way to un-reference these dirty states
  const dirtyStates = React
    .useMemo<{ data: AsyncStateEntry<any>[] }>(onInitialStatesChange, [initialStates]);

  // this will serve to dispose old async states that were hoisted
  // since initialStates changed
  React.useEffect(onDirtyStatesChange, [dirtyStates]);

  // this should synchronously change the payload held by hoisted items
  // why not until effect? because all children may benefit from this in their
  // effects
  React.useMemo<void>(onPayloadChange, [payload]);

  const contextValue = React.useMemo<UseAsyncStateContextType>(
    makeContextValue,
    [manager, payload]
  );

  return (
    <AsyncStateContext.Provider value={contextValue}>
      {children}
    </AsyncStateContext.Provider>
  );

  function initialize() {
    return AsyncStateManager(initialStates);
  }

  function onInitialStatesChange(): { data: AsyncStateEntry<any>[] } {
    const output = Object.create(null);
    output.data = manager.setInitialStates(initialStates);
    return output;
  }

  function onDirtyStatesChange() {
    for (const entry of dirtyStates.data) {
      manager.dispose(entry.value);
    }
    // mutating this object here means un-referencing these entries
    // which should throw them to gc.
    dirtyStates.data = [];
  }

  function onPayloadChange() {
    // propagate the new payload
    for (const entry of Object.values(manager.entries)) {
      entry.value.payload = shallowClone(entry.value.payload, payload);
    }
  }

  function makeContextValue(): StateContextValue {
    return {
      manager,
      payload: shallowClone(payload),

      get: manager.get,
      run: manager.run,
      hoist: manager.hoist,
      watch: manager.watch,
      dispose: manager.dispose,
      watchAll: manager.watchAll,
      getAllKeys: manager.getAllKeys,
      runAsyncState: manager.runAsyncState,
      notifyWatchers: manager.notifyWatchers,
      producerEffectsCreator: manager.producerEffectsCreator,
    };
  }
}


const listenersKey = Symbol();

// the manager contains all functions responsible for managing the context provider
// there is a manager per provider
// the manager operates on the asyncStateEntries map after copying the oldManager watchers
export function AsyncStateManager(
  initializer?: InitialStates
): AsyncStateManagerInterface {

  let asyncStateEntries: AsyncStateEntries = Object
    .values(initializer ?? EMPTY_OBJECT)
    .reduce(
      createInitialAsyncStatesReducer,
      Object.create(null)
    ) as AsyncStateEntries;

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
    runAsyncState,
    notifyWatchers,
    setInitialStates
  };
  output.producerEffectsCreator = createProducerEffectsCreator(output);

  return output;

  function setInitialStates(initialStates?: InitialStates): AsyncStateEntry<any>[] {
    const newStatesMap: Record<string, ExtendedInitialAsyncState<any>> =
      Object
        .values(initialStates ?? EMPTY_OBJECT)
        .reduce((result, current) => {
          // @ts-ignore
          result[current.key] = current;
          return result;
        }, Object.create(null)) as Record<string, ExtendedInitialAsyncState<any>>;

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
        notifyWatchers(key, entry.value);
      }
      if (!newStatesMap[key] && entry.initiallyHoisted) {
        entry.initiallyHoisted = false;
        entriesToRemove.push(entry);
      }
    }

    return entriesToRemove;
  }

  function get<T>(
    key: string
  ): StateInterface<T> {
    return asyncStateEntries[key]?.value;
  }

  function run<T>(
    asyncState: StateInterface<T>,
    ...args: any[]
  ): AbortFn {
    return asyncState.run(output.producerEffectsCreator, ...args);
  }

  function runAsyncState<T>(
    key: AsyncStateKeyOrSource<T>,
    lane: string | undefined,
    ...args: any[]
  ): AbortFn {
    let asyncState: StateInterface<T>;
    // always attempt a source object
    if (isAsyncStateSource(key)) {
      asyncState = readAsyncStateFromSource(key as Source<T>);
    } else {
      asyncState = get(key as string);
    }

    if (!asyncState) {
      return undefined;
    }

    if (lane) {
      asyncState = asyncState.getLane(lane);
    }

    return run(asyncState, ...args);
  }

  function dispose<T>(
    asyncState: StateInterface<T>
  ): boolean {
    const {key} = asyncState;

    // delete only if it was not initially hoisted
    const entry = asyncStateEntries[key]
    if (
       entry &&
      !entry.initiallyHoisted &&
      entry.value.subscriptions &&
      Object.values(entry.value.subscriptions).length === 0
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
    function cb() {
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
    asyncify(cb)();
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
  return {value: asyncState, initiallyHoisted};
}


function createInitialAsyncStatesReducer(
  result: AsyncStateEntries,
  current: ExtendedInitialAsyncState<any>
): AsyncStateEntries {
  if (isAsyncStateSource(current)) {
    const key = current.key;
    const existingEntry = result[key];
    const asyncState = readAsyncStateFromSource(
      current as Source<any>);

    if (!existingEntry || asyncState !== existingEntry.value) {
      result[key] = createAsyncStateEntry(asyncState, true);
      result[key].initiallyHoisted = true;
    }

    return result;
  } else {
    const {key, producer, config} = current as InitialAsyncState<any>;
    const initialValue = config?.initialValue;
    const existingEntry = result[key];
    if (existingEntry) {
      const asyncState = existingEntry.value;
      if (
        asyncState.originalProducer === producer &&
        asyncState.config.initialValue === initialValue
      ) {
        return result;
      }
    }
    result[key] = createAsyncStateEntry(
      new AsyncState(
        key,
        producer,
        readProducerConfigFromProducerConfig((current as InitialAsyncState<any>).config)
      ),
      true
    );
    result[key].initiallyHoisted = true;
    return result;
  }
}

