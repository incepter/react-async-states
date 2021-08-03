import AsyncState from "../../async-state/AsyncState";
import { createAsyncStateEntry, runScheduledAsyncState } from "../provider/providerUtils";

export function AsyncStateManager(asyncStateEntries) {
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
      listeners[key] = {meter: 0};
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

    if (listeners[key]) {
      Object.values(listeners).forEach(function notifyListeners(listener) {
        listener.notify(returnValue);
      });
    }

    return returnValue;
  }

  return {run, get, fork, hoist, dispose, waitFor, runAsyncState};
}
