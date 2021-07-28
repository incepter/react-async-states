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
      return;
    }

    const forkedAsyncState = asyncState.fork(forkConfig);
    asyncStateEntries[forkedAsyncState.key] = createAsyncStateEntry(forkedAsyncState);

    return forkedAsyncState;
  }

  function hoist(config) {
    const {key, hoistToProviderConfig = EMPTY_OBJECT, promiseConfig} = config;

    const existing = get(key);
    if (existing && !hoistToProviderConfig.override) {
      return;
    }

    if (existing) {
      let didDispose = dispose(existing);
      if (didDispose) {
        asyncStateEntries[key] = createAsyncStateEntry(new AsyncState({key, ...promiseConfig}));
      }
    }

    return existing;
  }

  function get(key) {
    return asyncStateEntries[key]?.value;
  }

  function run(asyncState) {
    const asyncStateEntry = asyncStateEntries[asyncState.key];
    return runScheduledAsyncState(asyncStateEntry);
  }

  return {run, get, fork, hoist, dispose};
}
