import AsyncState, {
  AbortFn,
  AsyncStateInterface,
  AsyncStateKey,
  AsyncStateWatchKey,
  ForkConfigType,
  State
} from "async-state";
import {asyncify, readAsyncStateConfigFromSubscriptionConfig, shallowClone} from "shared";
import {createAsyncStateEntry} from "./providerUtils";
import {isAsyncStateSource} from "async-state/AsyncState";
import {readAsyncStateFromSource} from "async-state/utils";
import {
  ArraySelector,
  AsyncStateEntries,
  AsyncStateKeyOrSource,
  AsyncStateManagerInterface,
  AsyncStateSelector,
  AsyncStateSelectorKeys,
  FunctionSelector,
  ManagerHoistConfig,
  ManagerWatchCallback,
  ManagerWatchCallbackValue,
  ManagerWatchers,
  WatcherType
} from "../../types";

const listenersKey = Symbol();

// the manager contains all functions responsible for managing the context provider
// there is a manager per provider
// the manager operates on the asyncStateEntries map after copying the oldManager watchers
export function AsyncStateManager
    (asyncStateEntries: AsyncStateEntries, oldManager: AsyncStateManagerInterface | undefined): AsyncStateManagerInterface {

  // stores all listeners/watchers about an async state
  let watchers: ManagerWatchers = shallowClone(oldManager?.watchers);
  return {run, get, fork, select, hoist, dispose, watch, notifyWatchers, runAsyncState, getAllKeys, watchers, watchAll};

  function get<T>(key: AsyncStateKey): AsyncStateInterface<T> {
    return asyncStateEntries[key]?.value;
  }

  function run<T>(asyncState: AsyncStateInterface<T>, ...args: any[]): AbortFn {
    return asyncState.run(...args);
  }

  function runAsyncState<T>(key: AsyncStateKeyOrSource<T>, ...args: any[]): AbortFn {
    let asyncState: AsyncStateInterface<T>;
    // always attempt a source object
    if (isAsyncStateSource(key)) {
      asyncState = readAsyncStateFromSource(key);
    } else {
      asyncState = get(key as AsyncStateKey);
    }
    if (!asyncState) {
      return undefined;
    }
    return run(asyncState, ...args);
  }

  function dispose<T>(asyncState: AsyncStateInterface<T>): boolean {
    const {key} = asyncState;
    const asyncStateEntry = asyncStateEntries[key];

    // either a mistake/bug, or subscription was via source
    if (!asyncStateEntry) {
      return asyncState.dispose();
    }

    const didDispose = asyncStateEntry.value.dispose();

    // delete only if it was not initially hoisted and the dispose is successful (no locks)
    if (!asyncStateEntry.initiallyHoisted && didDispose) {
      delete asyncStateEntries[key];
      // notify watchers about disappearance
      notifyWatchers(key, null);
    }

    return didDispose;
  }

  // the fork registers in the provider automatically
  function fork<T>(key: AsyncStateKey, forkConfig: ForkConfigType): AsyncStateInterface<T> | undefined {
    const asyncState: AsyncStateInterface<T> = get(key);
    if (!asyncState) {
      return undefined;
    }

    const forkedAsyncState = asyncState.fork(forkConfig);
    asyncStateEntries[forkedAsyncState.key] = createAsyncStateEntry(forkedAsyncState);

    notifyWatchers(forkedAsyncState.key, asyncStateEntries[forkedAsyncState.key].value);

    return forkedAsyncState;
  }

  // there is two types of watchers: per key, and watching everything
  // the everything watcher is the useAsyncStateSelector with a function selecting keys
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
  function watch<T>(key: AsyncStateWatchKey, notify: ManagerWatchCallback<T>): AbortFn {
    if (!watchers[key]) {
      watchers[key] = {meter: 0, watchers: {}};
    }

    // these are the watchers about the specified key
    let keyWatchers = watchers[key];
    const index = ++keyWatchers.meter;

    let didUnwatch = false;

    function notification(argv: ManagerWatchCallbackValue<T>) {
      if (!didUnwatch) {
        notify(argv);
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

  function notifyWatchers<T>(key: AsyncStateKey, value: ManagerWatchCallbackValue<T>): void {
    // it is important to close over the notifications to be sent
    // to avoid sending notifications to old closures that aren't relevant anymore
    // if this occurs, the component will receive a false notification that may let him enter an infinite loop
    let notificationCallbacks: WatcherType[] = [];

    if (watchers[listenersKey]?.watchers) {
      notificationCallbacks = Object.values(watchers[listenersKey].watchers);
    }
    if (watchers[key]) {
      notificationCallbacks = notificationCallbacks.concat(Object.values(watchers[key].watchers));
    }

    function cb() {
      notificationCallbacks.forEach(function notifyWatcher(watcher) {
        watcher.notify(value, key);
      });
    }

    // the notification should not go synchronous
    // because it occurs when a component A is rendering, if we notify a component B that schedules a render
    // react would throw a warning in the console about scheduling an update in a component in the render phase
    // from another one
    asyncify(cb)();
  }

  function hoist<T>(config: ManagerHoistConfig<T>): AsyncStateInterface<T> {
    const {key, hoistToProviderConfig = {override: false}, producer} = config;

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
      new AsyncState(key, producer, readAsyncStateConfigFromSubscriptionConfig(config))
    );

    const returnValue: AsyncStateInterface<T> = get(key);
    notifyWatchers(key, returnValue); // this is async

    return returnValue;
  }

  function selectIncludeKeyReducer
  (result: { [id: AsyncStateKey]: State<any> | undefined }, key: AsyncStateKey): { [id: AsyncStateKey]: State<any> | undefined } {
    result[key] = get(key)?.currentState;
    return result;
  }

  function select<T>(keys: AsyncStateSelectorKeys, selector: AsyncStateSelector<T>, reduceToObject?: boolean): T {
    if (reduceToObject) {
      const statesMap = keys.reduce(selectIncludeKeyReducer, {});
      return (selector as FunctionSelector<T>)(statesMap);
    }
    const statesArray = keys.map(key => get(key)?.currentState);
    return (selector as ArraySelector<T>)(...statesArray);
  }

  //
  // function runAndWait(key, ...args) {
  //   return new Promise(function promiseDefinition(resolve, reject) {
  //     const asyncState = get(key);
  //     if (!asyncState) {
  //       return;
  //     }
  //     let unsubscribe = asyncState.subscribe(function subscription(stateValue) {
  //
  //       const status = stateValue?.status;
  //       if (status === AsyncStateStatus.success) {
  //         resolve(stateValue);
  //       }
  //       if (status === AsyncStateStatus.error) {
  //         reject(stateValue);
  //       }
  //       if (status !== AsyncStateStatus.pending) {
  //         invokeIfPresent(unsubscribe);
  //       }
  //     });
  //     asyncState.run(...args);
  //   });
  //
  // }

  // used in function selector in useAsyncStateSelector
  function getAllKeys(): AsyncStateKey[] {
    return Object.keys(asyncStateEntries);
  }
}
