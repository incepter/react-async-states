import React from "react";
import { EMPTY_OBJECT, invokeIfPresent } from "../utils";
import { AsyncStateContext } from "./context";
import AsyncState from "../async-state/AsyncState";

const defaultConfig = Object.freeze({
  hoistToProvider: false,
});
const defaultRerenderStatusConfig = Object.freeze({
  error: true,
  success: true,
  aborted: true,
  loading: true,
});

function createSubscriptionConfigFromString(key) {
  return {
    key,
    hoistToProvider: false,
  };
}

export function useAsyncState(subscriptionConfig = defaultConfig, dependencies) {
  const asyncState = React.useRef();
  const contextValue = React.useContext(AsyncStateContext);
  const [, rerender] = React.useState();

  const providedConfig = React.useMemo(function getConfig() {
    if (typeof subscriptionConfig === "string") {
      return createSubscriptionConfigFromString(subscriptionConfig);
    }
    return typeof subscriptionConfig === "function" ? subscriptionConfig() : subscriptionConfig;
  }, dependencies);

  // this will never change, because if suddenly you are no longer in this context
  // this means this component no longer exists (diffing algorithm will detect a type change and unmount)
  // so it is safe not be added as dependency to hooks ;)
  const isInsideProvider = contextValue !== null;

  const {
    payload = EMPTY_OBJECT,
    rerenderStatus = defaultRerenderStatusConfig,
    condition = true,
    key, // required: the async-state key, will be used to subscribe to nearest provider

    hoistToProvider, // defaults to false
    promiseConfig, // optional, means a registration + subscription, goes along with hoistToProvider
    fork = false,
    forkConfig = EMPTY_OBJECT,
  } = providedConfig;

  const registrationConfig = React.useMemo(function getAS() { // this useMemo acts like a construction for now
    let output;
    if (isInsideProvider) {
      output = contextValue.get(key);
      if (output) {
        if (fork) {
          if (hoistToProvider) {
            output = contextValue.fork(key, forkConfig);
          } else {
            output = output.fork(forkConfig);
          }
        }
      } else if (hoistToProvider) {
        if (fork) {
          output = contextValue.fork(key, forkConfig);
        } else {
          output = contextValue.hoist(providedConfig);
        }
      } else if (promiseConfig) {
        output = new AsyncState({key, ...promiseConfig});
      }

    } else if (promiseConfig) {
      output = new AsyncState({key, ...promiseConfig});
    }

    if (asyncState.current) {
      asyncState.current.dispose();
    }
    asyncState.current = output;
    return providedConfig;
  }, [providedConfig]);

  // subscribe early to current value of asyncState
  React.useLayoutEffect(function onAsyncStateRefChange() {
    if (!asyncState.current) {
      return; // that's a problem!
    }
    /**
     * the thing is, this hook serve as a subscription and at the same time can work standalone
     * if it is a subscription that add values to payload and hoist it, other subscriptions may occur and override the payload
     * todo: figure out how to deal the comment above
     */
    if (!Object.is(payload, EMPTY_OBJECT)) { // payload was not set by developer
      asyncState.current.payload = {
        ...asyncState.current.payload,
        ...(isInsideProvider ? contextValue.payload : EMPTY_OBJECT),
        ...payload,
      };
    }
    const rerenderConfig = {...defaultRerenderStatusConfig, ...rerenderStatus};
    const unsubscribe = asyncState.current.subscribe(function onUpdate(newState) {
      if (rerenderConfig[newState.status]) {
        rerender({});
      }
    });

    function cleanup() {
      invokeIfPresent(unsubscribe);
      if (isInsideProvider) {
        contextValue.dispose(asyncState.current);
      } else if (asyncState.current) {
        asyncState.current.dispose();
      }
    }
    return cleanup;
  }, [asyncState.current]);

  function run() {
    const shouldRun = asyncState.current && condition && !asyncState.current.config?.lazy;
    if (shouldRun && !isInsideProvider) {
      return asyncState.current.run();
    }

    if (shouldRun && isInsideProvider) {
      if (fork && !hoistToProvider) {
        return asyncState.current.run();
      }
      return contextValue.run(asyncState.current);
    }

    return undefined; // nothing to clean
  }

  React.useEffect(run, dependencies); // dependencies should contain condition if controlled + asyncState is a ref

  return {
    key: asyncState.current?.key,

    run: asyncState.current?.run.bind(asyncState.current),
    abort: asyncState.current?.abort.bind(asyncState.current),
    replaceState: asyncState.current?.setState.bind(asyncState.current),

    state: Object.freeze({...asyncState.current?.currentState}),
    previousState: asyncState.current?.previousState ? Object.freeze({...asyncState.current?.previousState}) : undefined,
  };
}
