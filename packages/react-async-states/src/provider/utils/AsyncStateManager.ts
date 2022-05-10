import {
  asyncify,
  EMPTY_OBJECT,
  readProducerConfigFromSubscriptionConfig
} from "shared";
import {
  createAsyncStateEntry,
  createInitialAsyncStatesReducer,
} from "./providerUtils";
import {
  ArraySelector,
  AsyncStateEntries,
  AsyncStateEntry,
  AsyncStateKeyOrSource,
  AsyncStateManagerInterface,
  AsyncStateSelector,
  AsyncStateSelectorKeys,
  AsyncStateWatchKey, ExtendedInitialAsyncState,
  FunctionSelector,
  InitialStates,
  ManagerHoistConfig,
  ManagerWatchCallback,
  ManagerWatchCallbackValue,
  ManagerWatchers,
  WatcherType
} from "../../types.internal";
import {createRunExtraPropsCreator} from "../../helpers/run-props-creator";
import AsyncState, {
  AbortFn,
  AsyncStateInterface,
  AsyncStateKey,
  AsyncStateSource,
  ForkConfig,
  State
} from "../../async-state";
import {isAsyncStateSource} from "../../async-state/AsyncState";
import {readAsyncStateFromSource} from "../../async-state/read-source";

const listenersKey = Symbol();

// the manager contains all functions responsible for managing the context provider
// there is a manager per provider
// the manager operates on the asyncStateEntries map after copying the oldManager watchers
export function AsyncStateManager(
  initializer?: InitialStates
): AsyncStateManagerInterface {

  const asyncStateEntries: AsyncStateEntries = Object
    .values(initializer ?? EMPTY_OBJECT)
    .reduce(
      createInitialAsyncStatesReducer,
      Object.create(null)
    ) as AsyncStateEntries;

  // stores all listeners/watchers about an async state
  let watchers: ManagerWatchers = Object.create(null);

  // @ts-ignore
  // ts is yelling at runExtraPropsCreator property which will be assigned
  // in the next statement.
  const output: AsyncStateManagerInterface = {
    entries: asyncStateEntries,
    run,
    get,
    fork,
    hoist,
    watch,
    select,
    dispose,
    watchers,
    watchAll,
    getAllKeys,
    runAsyncState,
    notifyWatchers,
    setInitialStates
  };
  output.runExtraPropsCreator = createRunExtraPropsCreator(output);

  return output;

  function setInitialStates(initialStates?: InitialStates): AsyncStateEntry<any>[] {
    const newStatesMap: {[id: AsyncStateKey]: ExtendedInitialAsyncState<any>} =
      Object
        .values(initialStates ?? EMPTY_OBJECT)
        .reduce((result, current) => {
          // @ts-ignore
          result[current.key] = current;
          return result;
        }, Object.create(null)) as {[id: AsyncStateKey]: ExtendedInitialAsyncState<any>};

    Object
      .values(newStatesMap)
      .reduce(
        createInitialAsyncStatesReducer,
        asyncStateEntries,
      ) as AsyncStateEntries;

    // we should remove the states that were initially hoisted
    // but do no-longer exist in provider.
    // these states should not exist unless there is a subscriber to them
    // in this case, we should mark them as not initially hoisted
    const entriesToRemove: AsyncStateEntry<any>[] = [];
    for (const [key, entry] of Object.entries(asyncStateEntries)) {
      if (newStatesMap[key]) {
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
    key: AsyncStateKey
  ): AsyncStateInterface<T> {
    return asyncStateEntries[key]?.value;
  }

  function run<T>(
    asyncState: AsyncStateInterface<T>,
    ...args: any[]
  ): AbortFn {
    return asyncState.run(output.runExtraPropsCreator, ...args);
  }

  function runAsyncState<T>(
    key: AsyncStateKeyOrSource<T>,
    ...args: any[]
  ): AbortFn {
    let asyncState: AsyncStateInterface<T>;
    // always attempt a source object
    if (isAsyncStateSource(key)) {
      asyncState = readAsyncStateFromSource(key as AsyncStateSource<T>);
    } else {
      asyncState = get(key as AsyncStateKey);
    }
    if (!asyncState) {
      return undefined;
    }
    return run(asyncState, ...args);
  }

  function dispose<T>(
    asyncState: AsyncStateInterface<T>
  ): boolean {
    const {key} = asyncState;

    // delete only if it was not initially hoisted
    if (
      asyncStateEntries[key] &&
      !asyncStateEntries[key].initiallyHoisted &&
      Object.values(asyncStateEntries[key].value.subscriptions).length === 0
    ) {
      delete asyncStateEntries[key];
      // notify watchers about disappearance
      notifyWatchers(key, null);

      return true;
    }

    return false;
  }

  // the fork registers in the provider automatically
  function fork<T>(
    key: AsyncStateKey,
    forkConfig: ForkConfig
  ): AsyncStateInterface<T> | undefined {
    const asyncState: AsyncStateInterface<T> = get(key);
    if (!asyncState) {
      return undefined;
    }

    const forkedAsyncState = asyncState.fork(forkConfig);
    asyncStateEntries[forkedAsyncState.key] = createAsyncStateEntry(
      forkedAsyncState, false);

    notifyWatchers(
      forkedAsyncState.key,
      asyncStateEntries[forkedAsyncState.key].value
    );

    return forkedAsyncState;
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
      notificationKey: AsyncStateKey
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
    key: AsyncStateKey,
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

  function hoist<T>(config: ManagerHoistConfig<T>): AsyncStateInterface<T> {
    const {
      key,
      hoistToProviderConfig = {override: false},
      producer
    } = config;

    const existing = get(key);
    if (existing && !hoistToProviderConfig.override) {
      return existing as AsyncStateInterface<T>;

    }
    if (existing) {
      let didDispose = dispose(existing);

      if (!didDispose) {
        return existing as AsyncStateInterface<T>;
      }
    }

    asyncStateEntries[key] = createAsyncStateEntry(
      new AsyncState(
        key,
        producer,
        readProducerConfigFromSubscriptionConfig(config)
      ),
      false
    );

    const returnValue: AsyncStateInterface<T> = get(key);
    notifyWatchers(
      key,
      returnValue
    ); // this is async

    return returnValue;
  }

  function selectIncludeKeyReducer
  (
    result: { [id: AsyncStateKey]: State<any> | undefined },
    key: AsyncStateKey
  ): { [id: AsyncStateKey]: State<any> | undefined } {
    result[key] = get(key)?.currentState;
    return result;
  }

  function select<T>(
    keys: AsyncStateSelectorKeys,
    selector: AsyncStateSelector<T>,
    reduceToObject?: boolean
  ): T {
    if (reduceToObject) {
      const statesMap = keys.reduce(
        selectIncludeKeyReducer,
        {}
      );
      return (selector as FunctionSelector<T>)(statesMap);
    }
    const statesArray = keys.map(key => get(key)?.currentState);
    return (selector as ArraySelector<T>)(...statesArray);
  }

  // used in function selector in useSelector
  function getAllKeys(): AsyncStateKey[] {
    return Object.keys(asyncStateEntries);
  }
}
