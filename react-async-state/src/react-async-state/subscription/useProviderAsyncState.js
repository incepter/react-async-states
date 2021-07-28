import React from "react";
import { AsyncStateContext } from "../context";
import useRawAsyncState from "./useRawAsyncState";
import { EMPTY_OBJECT } from "../../utils";
import AsyncState from "../../async-state/AsyncState";

export default function useProviderAsyncState(configuration, dependencies) {
  const [guard, setGuard] = React.useState(EMPTY_OBJECT);
  const contextValue = React.useContext(AsyncStateContext);
  const {key, promiseConfig, fork = false, hoistToProvider, forkConfig = EMPTY_OBJECT,} = configuration;

  const asyncState = React.useMemo(function inferAsyncState() {
    let candidate = contextValue.get(key);

    if (candidate) {
      if (fork) {
        if (hoistToProvider) {
          candidate = contextValue.hoist(key, forkConfig);
        } else {
          candidate = candidate.fork(forkConfig);
        }
      } else {
        if (hoistToProvider) {
          candidate = contextValue.hoist(configuration);
        }
      }
    } else {
      if (hoistToProvider) {
        candidate = contextValue.hoist(configuration);
      } else if (promiseConfig) {
        candidate = new AsyncState({key, ...promiseConfig});
      } else {
        candidate = waitingAsyncState;
      }
    }

    return candidate;
  }, [guard, ...dependencies]);

  React.useEffect(function waitForIfUndefined() {
    if (asyncState !== waitingAsyncState) {
      return undefined;
    }

    return contextValue.waitFor(key, function notify() {
      setGuard({});
    });
  }, [asyncState]);


  return useRawAsyncState(asyncState, dependencies, configuration, function run() {
    if (hoistToProvider) {
      return contextValue.run(asyncState);
    }
    return asyncState.run();
  });
}

function NoOp() {
}

const waitingAsyncState = new AsyncState({
  key: Symbol("waiting_async_state"),
  promise() {
    return new Promise(NoOp);
  }
});
