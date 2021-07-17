import React from "react";
import { AsyncStateContext } from "./context";
import { EMPTY_ARRAY, EMPTY_OBJECT, invokeIfPresent } from "../utils";
import AsyncState from "../async-state/AsyncState";

function createAsyncStateEntry(asyncState) {
  return {
    value: asyncState,
    scheduledRunsCount: -1,
  };
}

export function AsyncStateProvider({payload = EMPTY_OBJECT, children, initialAsyncStates = EMPTY_ARRAY}) {
  const asyncStates = React.useRef();

  if (!asyncStates.current) {
    asyncStates.current = {};
  }

  React.useMemo(function constructAsyncStates() {
    // dispose old async states
    Object.values(asyncStates.current).forEach(dispose);
    asyncStates.current = initialAsyncStates.reduce(function createInitialAsyncStates(result, current) {
      const {key, promise, config} = current;
      result[current.key] = createAsyncStateEntry(new AsyncState({key, promise, config}));
      result[current.key].initiallyHoisted = true;
      return result;
    }, {});
  }, [initialAsyncStates]);

  function dispose(asyncState) {
    const {key} = asyncState;
    const asyncStateEntry = asyncStates.current[key];
    if (!asyncStateEntry || asyncStateEntry?.initiallyHoisted) {
      return;
    }
    const didDispose = asyncState.dispose();
    if (didDispose) {
      delete asyncStates.current[key];
    }
  }

  function fork(key, forkConfig) {
    const asyncState = get(key);

    if (!asyncState) {
      return;
    }

    const forkedAsyncState = asyncState.fork(forkConfig);
    asyncStates.current[forkedAsyncState.key] = createAsyncStateEntry(forkedAsyncState);

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
        asyncStates.current[key] = createAsyncStateEntry(new AsyncState({key, ...promiseConfig}));
      }
    }
    return get(key);

  }

  function get(key) {
    return asyncStates.current[key]?.value;
  }

  function run(asyncState) {
    const asyncStateEntry = asyncStates.current[asyncState.key];
    return runScheduledAsyncState(asyncStateEntry);
  }

  const contextValue = React.useMemo(() => ({
    get,
    run,
    fork,
    hoist,
    payload,
    dispose,
  }), []);

  React.useEffect(function runNonLazyAsyncStates() {
    const cleanups = [];
    initialAsyncStates.forEach(function runAndGetCleanup(as) {
      const entry = asyncStates.current[as.key];
      if (!entry) {
        return;
      }
      cleanups.push(run(entry.value));
    });
    return function cleanup() {
      cleanups.forEach(function cleanupRun(cb) {
        invokeIfPresent(cb);
      })
    }
  }, [initialAsyncStates]);

  return (
    <AsyncStateContext.Provider value={contextValue}>
      {children}
    </AsyncStateContext.Provider>
  );
}

function runScheduledAsyncState(asyncStateEntry) {
  if (asyncStateEntry.scheduledRunsCount === -1) {
    asyncStateEntry.scheduledRunsCount = 1;
  } else {
    asyncStateEntry.scheduledRunsCount += 1;
  }

  let isCancelled = false;

  function cancel() {
    isCancelled = true;
    if (asyncStateEntry.scheduledRunsCount === 1) {
      asyncStateEntry.scheduledRunsCount = -1;
    } else if (asyncStateEntry.scheduledRunsCount > 1) {
      asyncStateEntry.scheduledRunsCount -= 1;
    }
  }

  function runner() {
    if (!isCancelled) {
      if (asyncStateEntry.scheduledRunsCount === 1) {
        asyncStateEntry.value.run();
        asyncStateEntry.scheduledRunsCount = -1;
      } else {
        asyncStateEntry.scheduledRunsCount -= 1;
      }
    }
  }

  Promise.resolve().then(runner);

  return cancel;
}
