import React from "react";
import { EMPTY_OBJECT, invokeIfPresent } from "../utils";
import { AsyncStateContext } from "./context";
import AsyncState from "../async-state/AsyncState";
import useRerender from "./utils/useRerender";

export function useAsyncState(subscriptionConfig, dependencies) {
  const rerender = useRerender();
  const asyncState = React.useRef();
  const returnValue = React.useRef();
  const contextValue = React.useContext(AsyncStateContext);

  const configuration = React.useMemo(function readConfiguration() {
    return readConfig(subscriptionConfig || defaultConfig);
  }, dependencies);

  // this will never change, because if suddenly you are no longer in this context
  // this means this component no longer exists (diffing algorithm will detect a type change and unmount)
  // so it is safe not be added as dependency to hooks ;)
  const isInsideProvider = contextValue !== null; // null == context default value (React.createContext(null))

  const {
    payload = EMPTY_OBJECT,
    rerenderStatus = defaultRerenderStatusConfig,
    condition = true,
    key, // required: the async-state key, will be used to subscribe to nearest provider

    hoistToProvider, // defaults to false
    promiseConfig, // optional, means a registration + subscription, goes along with hoistToProvider
    fork = false,
    forkConfig = EMPTY_OBJECT,
  } = configuration;

  const oldConfiguration = React.useMemo(function getAsyncState() { // this useMemo acts like a construction for now

    const didConfigChange = didUserConfigurationChange(configuration, oldConfiguration);
    if (!didConfigChange && asyncState.current) {
      return configuration;
    }

    let candidate;
    if (!isInsideProvider) {
      // working on standalone mode. todo: check on promiseConfig validity
      candidate = new AsyncState({key, ...promiseConfig});
    } else {
      candidate = contextValue.get(key);
      /**
       * cases:
       * found in provider ?
       *      fork ?
       *          yes:
       *              hoist ?
       *                yes: contextValue.fork
       *                no: instance.fork
       *           no:
       *              hoist ?
       *                  yes: contextValue.hoist
       *                  no: use instance itself
       *
       * not found in provider (fork isn't supported) ?
       *      hoist ?
       *          yes: contextValue.hoist
       *          no: new AsyncState
       */
      if (candidate) {
        if (fork) {
          if (hoistToProvider) {
            candidate = contextValue.fork(key, forkConfig);
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
        } else {
          candidate = new AsyncState({key, ...promiseConfig});
        }
      }

    }

    asyncState.current = candidate;

    if (asyncState.current) {
      returnValue.current = makeReturnValueFromAsyncState(asyncState.current);
    } else {
      returnValue.current = makeEmptyReturnValueForKey(key);
    }

    return configuration;
  }, [configuration]);

  // subscribe early to current value of asyncState
  function subscribeOnAsyncStateRefChange() {
    if (!asyncState.current) {
      return undefined;
    }

    const rerenderConfig = {...defaultRerenderStatusConfig, ...rerenderStatus};

    const unsubscribe = asyncState.current.subscribe(function onUpdate(newState) {
      if (rerenderConfig[newState.status]) {
        returnValue.current = makeReturnValueFromAsyncState(asyncState.current);
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
  }

  function run() {
    const shouldRun = asyncState.current && condition && !asyncState.current.config?.lazy;

    if (shouldRun) {
      if (!Object.is(payload, EMPTY_OBJECT)) { // payload was not set by developer (defaultValue)
        asyncState.current.payload = {
          ...asyncState.current.payload,
          ...(isInsideProvider ? contextValue.payload : EMPTY_OBJECT),
          ...payload,
        };
      }

      if (!isInsideProvider) {
        return asyncState.current.run();
      } else {
        if (fork && !hoistToProvider) {
          return asyncState.current.run();
        }
        return contextValue.run(asyncState.current);
      }
    }

    return undefined;
  }

  React.useLayoutEffect(subscribeOnAsyncStateRefChange, [asyncState.current]); // asyncState is mutated during render
  React.useEffect(run, dependencies); // dependencies should contain condition if controlled + asyncState is a ref

  let currentAsyncState = asyncState.current;

  if (!currentAsyncState || !returnValue.current || (returnValue.current.empty && currentAsyncState.key !== key)) {
    returnValue.current = makeEmptyReturnValueForKey(key);
  }

  return returnValue.current;
}

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

// user config is the config the developer wrote
function readConfig(userConfig) {
  if (typeof userConfig === "function") {
    // if a function, re-attempt with string or object userConfig
    return readConfig(userConfig());
  }
  if (typeof userConfig === "string") {
    return createSubscriptionConfigFromString(userConfig);
  }
  return userConfig;
}

/**
 * this function will decide whether it should dispose the old asyncState instance and get new one, or simply reuse the old one
 * it will run when dependencies values change
 */
function didUserConfigurationChange(newConfig, oldConfig) {
  if (!newConfig || !oldConfig) {
    return true;
  }

  // let's assume that following properties are the deciders:
  // left not simplified for readability
  if (!Object.is(newConfig.key, oldConfig.key)) {
    return true;
  }
  if (!Object.is(newConfig.promiseConfig, oldConfig.promiseConfig)) {
    return true;
  }
  if (!Object.is(newConfig.fork, oldConfig.fork)) {
    return true;
  }
  if (!Object.is(newConfig.hoistToProvider, oldConfig.hoistToProvider)) {
    return true;
  }
  return false;
}

function makeEmptyReturnValueForKey(key) {
  return Object.freeze({key, state: Object.freeze({}), empty: true});
}

function makeReturnValueFromAsyncState(asyncState) {
  return Object.freeze({
    key: asyncState.key,

    run: asyncState.run.bind(asyncState),
    abort: asyncState.abort.bind(asyncState),
    replaceState: asyncState.replaceState.bind(asyncState),

    state: Object.freeze({...asyncState.currentState}),
    previousState: asyncState.previousState ? Object.freeze({...asyncState.previousState}) : undefined,
  });
}
