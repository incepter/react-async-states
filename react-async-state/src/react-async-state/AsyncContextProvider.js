import React from "react";
import { AsyncStateContext } from "./context";
import { EMPTY_ARRAY, EMPTY_OBJECT } from "../utils";
import AsyncState from "../async-state/AsyncState";

export function AsyncContextProvider({payload = EMPTY_OBJECT, children, initialAsyncStates = EMPTY_ARRAY}) {
  const asyncStates = React.useRef();

  if (!asyncStates.current) {
    asyncStates.current = {};
  }

  React.useMemo(function constructAsyncStates() {
    // dispose old async states
    Object.values(asyncStates.current).forEach(dispose);
    asyncStates.current = initialAsyncStates.reduce(function createInitialAsyncStates(result, current) {
      const {key, promise, config} = current;
      result[current.key] = new AsyncState({key, promise, config});
      return result;
    }, {});
  }, [initialAsyncStates]);

  function dispose(asyncState) {
    const {key} = asyncState;
    asyncState.dispose();
    delete asyncStates.current[key];
  }

  function fork(key, forkConfig) {
    const asyncState = get(key);

    if (!asyncState) {
      return;
    }

    const forkedAsyncState = asyncState.fork(forkConfig);
    asyncStates.current[key] = forkedAsyncState;

    return forkedAsyncState;
  }

  function hoist(config) {
    const {key, hoistToProviderConfig = EMPTY_OBJECT, promiseConfig} = config;

    const existing = get(key);
    if (existing && !hoistToProviderConfig.override) {
      return;
    }

    if (existing) {
      dispose(existing);
    }

    asyncStates.current[key] = new AsyncState({key, ...promiseConfig});
    return get(key);
  }

  function get(key) {
    return asyncStates.current[key];
  }

  const contextValue = React.useMemo(() => ({
    get,
    fork,
    hoist,
    payload,
    dispose,
  }), []);

  return (
    <AsyncStateContext.Provider value={contextValue}>
      {children}
    </AsyncStateContext.Provider>
  );
}
