import AsyncState from "../../async-state/AsyncState";
import { createAsyncStateEntry, runScheduledAsyncState } from "./providerUtils";
import { logger } from "../../logger";
import { asyncify, identity, shallowClone } from "../../shared";

const allWatchersKey = Symbol();

export function AsyncStateManager(asyncStateEntries, oldManager) {
  function get(key) {
    return asyncStateEntries[key]?.value;
  }

  function run(asyncState, ...args) {
    const asyncStateEntry = asyncStateEntries[asyncState.key];
    return runScheduledAsyncState(asyncStateEntry, ...args);
  }

  function runAsyncState(key, ...args) {
    const asyncState = get(key);
    if (!asyncState) {
      return undefined;
    }
    return run(asyncState, ...args);
  }

  function dispose(asyncState) {
    const {key} = asyncState;
    const asyncStateEntry = asyncStateEntries[key];

    if (!asyncStateEntry) {
      return false;
    }

    const didDispose = asyncStateEntry.value.dispose();

    if (!asyncStateEntry.initiallyHoisted && didDispose) {
      logger.info(`[provider][${key}] dispose`);
      delete asyncStateEntries[key];
      asyncify(notifyWatchers)(key, null);
    }

    return didDispose;
  }

  function fork(key, forkConfig) {
    const asyncState = get(key);
    if (!asyncState) {
      return undefined;
    }

    const forkedAsyncState = asyncState.fork(forkConfig);
    asyncStateEntries[forkedAsyncState.key] = createAsyncStateEntry(forkedAsyncState);

    asyncify(notifyWatchers)(forkedAsyncState.key, asyncStateEntries[forkedAsyncState.key].value);

    return forkedAsyncState;
  }

  let watchers = shallowClone(oldManager?.watchers);

  function watch(key, notify) {
    if (!watchers[key]) {
      watchers[key] = {meter: 0, watchers: {}};
    }

    let keyWatchers = watchers[key];
    const index = ++keyWatchers.meter;
    keyWatchers.watchers[index] = {notify, cleanup};

    function cleanup() {
      delete keyWatchers.watchers[index];
    }

    return cleanup;
  }

  function watchAll(notify) {
    return watch(allWatchersKey, notify);
  }

  function notifyWatchers(key, value) {
    if (!watchers[key]) {
      return;
    }
    Object.values(watchers[key].watchers).forEach(function notifyWatcher(watcher) {
      watcher.notify(value, key);
    })
    if (watchers[allWatchersKey]?.watchers) {
      Object.values(watchers[allWatchersKey].watchers).forEach(function notifyWatcher(watcher) {
        watcher.notify(value, key);
      })
    }
  }

  function hoist(config) {
    const {key, hoistToProviderConfig = {override: false}, promise, lazy, initialValue} = config;

    const existing = get(key);
    if (existing && !hoistToProviderConfig.override) {
      return existing;

    }
    if (existing) {
      let didDispose = dispose(existing);
      if (!didDispose) {
        return existing;
      }
    }

    asyncStateEntries[key] = createAsyncStateEntry(new AsyncState(key, promise, {lazy, initialValue}));

    const returnValue = get(key);
    asyncify(notifyWatchers)(key, returnValue); // returnValue is an AsyncState or undefined

    return returnValue;
  }

  function selectIncludeKeyReducer(result, key) {
    result[key] = get(key)?.currentState;
    return result;
  }

  function select(keys, selector = identity, reduceToObject = false) {
    if (reduceToObject) {
      return selector(keys.reduce(selectIncludeKeyReducer, {}));
    }
    return selector(...keys.map(key => get(key)?.currentState));
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

  function getAllKeys() {
    return Object.keys(asyncStateEntries);
  }

  return {run, get, fork, select, hoist, dispose, watch, runAsyncState, getAllKeys, watchers, watchAll};
}
