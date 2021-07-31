import { EMPTY_OBJECT } from "../../utils";
import AsyncState from "../../async-state/AsyncState";
import { createAsyncStateEntry, runScheduledAsyncState } from "./providerUtils";

export function AsyncStateManager(asyncStateEntries) {
  function dispose(asyncState) {
    const {key} = asyncState;
    const asyncStateEntry = asyncStateEntries[key];
    if (!asyncStateEntry || asyncStateEntry?.initiallyHoisted) {
      return;
    }

    const didDispose = asyncStateEntry.value.dispose();

    if (didDispose) {
      delete asyncStateEntries[key];
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

    return forkedAsyncState;
  }

  let listeners = {};
  function waitFor(key, notify) {
    if (!listeners[key]) {
      listeners[key] = { meter: 0 };
    }

    let keyListeners = listeners[key];
    const index = ++keyListeners.meter;

    function cleanup() {
      delete keyListeners[index];
    }

    keyListeners[index] = {notify, cleanup};
    return cleanup;
  }

  function hoist(config) {
    const {key, hoistToProviderConfig = EMPTY_OBJECT, promise, promiseConfig} = config;

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

    asyncStateEntries[key] = createAsyncStateEntry(new AsyncState(key, promise, promiseConfig));
    const returnValue = get(key);

    if (listeners[key]) {
      Object.values(listeners).forEach(function notifyListeners(listener) {
        listener.notify(returnValue);
      });
    }

    return returnValue;
  }

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

  return {run, get, fork, hoist, dispose, waitFor, runAsyncState};
}
