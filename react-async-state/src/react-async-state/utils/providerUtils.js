import AsyncState from "../../async-state/AsyncState";
import { EMPTY_OBJECT } from "../../utils";
import runScheduledAsyncState from "../runScheduledAsyncState";

export function createAsyncStateEntry(asyncState) {
  return {
    value: asyncState,
    scheduledRunsCount: -1,
  };
}

export function createInitialAsyncStatesReducer(result, current) {
  const {key, promise, config} = current;
  result[current.key] = createAsyncStateEntry(new AsyncState({key, promise, config}));
  result[current.key].initiallyHoisted = true;
  return result;
}

export function providerDispose(asyncStateEntries) {

  return function sharedDispose(asyncState) {
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

}

export function providerFork(asyncStateEntries) {
  return function sharedFork(key, forkConfig) {
    const asyncState = get(key);

    if (!asyncState) {
      return;
    }

    const forkedAsyncState = asyncState.fork(forkConfig);
    asyncStateEntries[forkedAsyncState.key] = createAsyncStateEntry(forkedAsyncState);

    return forkedAsyncState;
  }
}

export function providerHoist(asyncStateEntries, dispose) {
  return function sharedHoist(config) {
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
    return get(key);
  }
}

export function providerGet(asyncStateEntries) {
  return function sharedGet(key) {
    return asyncStateEntries[key]?.value;
  }
}

export function providerRun(asyncStateEntries) {
  return function sharedRun(asyncState) {
    const asyncStateEntry = asyncStateEntries[asyncState.key];
    return runScheduledAsyncState(asyncStateEntry);
  }
}
