import * as React from "react";
import {EMPTY_ARRAY, EMPTY_OBJECT, invokeIfPresent, shallowClone} from "shared";
import {AsyncStateContext} from "../context";
import {
  applyUpdateOnReturnValue,
  calculateSelectedState,
  defaultRerenderStatusConfig,
  inferAsyncStateInstance,
  inferSubscriptionMode, applyWaitingReturnValue,
  shouldRecalculateInstance
} from "./utils/subscriptionUtils";
import {nextKey, readUserConfiguration} from "./utils/readConfig";
import {
  disposeAsyncStateSubscriptionFn,
  runAsyncStateSubscriptionFn
} from "./utils/asyncStateSubscription";
import {
  AsyncStateSubscriptionMode,
  ExtendedUseAsyncStateConfiguration,
  PartialUseAsyncStateConfiguration,
  UseAsyncStateContextType,
  UseAsyncStateRefsFactory,
  UseAsyncStateReturnValue,
  UseAsyncStateStateDeps,
  UseAsyncStateSubscriptionInfo
} from "../types";
import {AsyncStateInterface, AsyncStateKey} from "../../../async-state";

// guard: if inside provider, and subscription occurred before hoist, component may wait and uses this to trigger recalculation
// rerender: when async state updates and value change, if we should rerender (areEqual = false) => rerender
const initialStateDependencies = Object.freeze({
  rerender: EMPTY_OBJECT,
  guard: EMPTY_OBJECT
});

function refsFactory<T, E>(): UseAsyncStateRefsFactory<T, E> {
  return {
    returnValue: undefined,
    subscriptionInfo: undefined,
  };
}

// T matches what producer returns
// E matches the derived state
// mostly it will be E === T
export const useAsyncStateImpl = function useAsyncStateImpl<T, E>(
  subscriptionConfig: ExtendedUseAsyncStateConfiguration<T, E>,
  dependencies: readonly any[] = EMPTY_ARRAY,
  configOverrides?: Readonly<PartialUseAsyncStateConfiguration<T, E>>
): UseAsyncStateReturnValue<T, E> {

  const contextValue: UseAsyncStateContextType = React.useContext(
    AsyncStateContext);

  // the default value of AsyncStateContext is set to null
  const isInsideProvider = contextValue !== null;
  const runAsyncState = contextValue?.runAsyncState;

  // stateDeps and refs are merged into one to minimize the count of used hooks
  const factory = React.useRef<UseAsyncStateRefsFactory<T, E>>();
  const [stateDeps, setStateDeps] = React.useState<UseAsyncStateStateDeps>(
    initialStateDependencies);

  // initialize the ref that will be mutated,
  // the refsFactory shouldn't be put in useRef to avoid statically calling it
  if (!factory.current) {
    factory.current = refsFactory();
  }

  // destructure important information to the render's closure
  const {mode, asyncState, configuration, run, dispose} = React.useMemo(
    function readConfiguration(): UseAsyncStateSubscriptionInfo<T, E> {
      const newConfig = readUserConfiguration(
        subscriptionConfig,
        configOverrides
      );
      const newMode = inferSubscriptionMode(
        contextValue,
        newConfig
      );

      if (newConfig.key === undefined) {
        if (newConfig.source?.key !== undefined) {
          newConfig.key = newConfig.source.key;
        } else {
          newConfig.key = nextKey();
        }
      }

      const {guard} = stateDeps;
      if (!factory.current) {
        throw new Error("Couldn't find factory, this is a bug.");
      }
      const recalculateInstance = shouldRecalculateInstance(
        newConfig,
        newMode,
        guard,
        dependencies,
        factory.current.subscriptionInfo
      );

      let newAsyncState: AsyncStateInterface<T>;

      if (recalculateInstance) {
        newAsyncState = inferAsyncStateInstance(
          newMode,
          newConfig,
          contextValue
        );
      } else {
        if (!factory.current.subscriptionInfo) {
          throw new Error(
            "Couldn't find factory or its subscription info, this is a bug.");
        }
        newAsyncState = factory.current.subscriptionInfo.asyncState;
      }

      let output: UseAsyncStateSubscriptionInfo<T, E> = {
        guard,
        mode: newMode,
        deps: dependencies,
        configuration: newConfig,
        asyncState: newAsyncState,
        run: runAsyncStateSubscriptionFn(
          newMode,
          newAsyncState,
          newConfig,
          contextValue
        ),
        dispose: disposeAsyncStateSubscriptionFn(
          newMode,
          newAsyncState,
          newConfig,
          contextValue
        )
      };

      // assign payload
      if (output.asyncState) {
        if (!output.asyncState.payload) {
          output.asyncState.payload = Object.create(null);
        }
        // merge the payload in the async state immediately to benefit from its power
        output.asyncState.payload = Object.assign(
          output.asyncState.payload,
          contextValue?.payload,
          newConfig.payload
        );
      }

      // if the calculated async state instance changed
      if (output.asyncState !== factory.current.subscriptionInfo?.asyncState) {
        // whenever the async state changes, synchronously reset the return value
        factory.current.returnValue = undefined;
      }
      // store the current subscription info in the ref
      // it will be used in case something triggering this memo again
      // to decide whether we should recalculate the instance or not
      factory.current.subscriptionInfo = output;

      return output;
    },
    [contextValue, stateDeps.guard, ...dependencies]
  );

  // console.log('render', {key: configuration.key, mode, asyncState});
  // it is okay to use hooks inside this condition
  // because if it changes, react will throw the old tree to gc
  if (isInsideProvider) {
    // this sets  a watcher to observe present async state
    React.useEffect(
      function watchAsyncState() {
        let didClean = false;

        // if we are waiting and do not have an asyncState
        // this case is when this renders before the component hoisting the state
        // the notifyWatchers is scheduled via microTaskQueue,
        // that occurs after the layoutEffect and before is effect
        // that should watch over a state.
        // This means that we will miss the notification about the awaited state
        // so, if we are waiting without an asyncState, recalculate the memo
        if (mode === AsyncStateSubscriptionMode.WAITING && !asyncState) {
          let candidate = contextValue.get(configuration.key as AsyncStateKey);
          if (candidate) {
            // schedule the recalculation of the memo
            setStateDeps(old => ({guard: {}, rerender: old.rerender}));
            return;
          }
        }

        switch (mode) {
          // if this component is the one hoisting a state,
          // re-notify watchers that may missed the notification for some reason
          // this case is not likely to occur,
          // but this is like a safety check that notify the watchers
          // and quit because i don't think the hoister should watch over itself
          case AsyncStateSubscriptionMode.HOIST: {
            contextValue.notifyWatchers(
              asyncState.key,
              asyncState
            );
            return;
          }
          case AsyncStateSubscriptionMode.FORK:
          case AsyncStateSubscriptionMode.WAITING:
          case AsyncStateSubscriptionMode.LISTEN: {
            let watchedKey = AsyncStateSubscriptionMode.WAITING === mode
              ? configuration.key
              :
              asyncState?.key;

            const unwatch = contextValue.watch(
              watchedKey as AsyncStateKey,
              function notify(mayBeNewAsyncState) {
                if (didClean) {
                  return;
                }
                // only trigger a rerender if the newAsyncState is different
                // this re-render schedules a memo recalculation
                if (mayBeNewAsyncState !== asyncState) {
                  setStateDeps(old => ({
                    guard: {},
                    rerender: old.rerender
                  }));
                }
              }
            );
            return function cleanup() {
              didClean = true;
              invokeIfPresent(unwatch);
            };
          }
          // don't watch on these modes
          case AsyncStateSubscriptionMode.NOOP:
          case AsyncStateSubscriptionMode.SOURCE:
          case AsyncStateSubscriptionMode.STANDALONE:
          case AsyncStateSubscriptionMode.OUTSIDE_PROVIDER:
          default:
            return undefined;
        }
      },
      [mode, asyncState, configuration.key]
    );
  }

  // if rendering with an undefined value, construct the return value
  // this is important to be after the memo calculation
  // that may set this value to undefined in case of instance change
  if (!factory.current.returnValue) {
    factory.current.returnValue = Object.create(null);
    if (asyncState) {
      const calculatedState = calculateSelectedState(
        asyncState.currentState,
        asyncState.lastSuccess,
        configuration
      );
      applyUpdateOnReturnValue(
        factory.current.returnValue as UseAsyncStateReturnValue<T, E>,
        asyncState,
        calculatedState,
        run,
        runAsyncState,
        mode
      );
    } else {
      applyWaitingReturnValue(
        factory.current.returnValue as UseAsyncStateReturnValue<T, E>,
        configuration.key as AsyncStateKey,
        runAsyncState,
        mode,
      );
    }
  }

  // the subscription to state updates along with the decision to re-render
  React.useEffect(
    function subscribeToAsyncState() {
      if (!asyncState) {
        return undefined;
      }
      const {rerenderStatus} = configuration;
      const rerenderStatusConfig = shallowClone(
        defaultRerenderStatusConfig,
        rerenderStatus
      );

      // the subscribe function returns the unsubscribe function
      const unsubscribe = asyncState.subscribe(
        function onUpdate(newState) {
          if (!factory.current || !factory.current.returnValue) {
            // this makes ts happy + indicates a bug
            throw new Error(
              "Couldn't find factory or its return value in asyncstate subscription.");
          }
          const calculatedState = calculateSelectedState(
            newState,
            asyncState.lastSuccess,
            configuration
          );

          const prevStateValue = factory.current.returnValue.state;
          applyUpdateOnReturnValue(
            factory.current.returnValue,
            asyncState,
            calculatedState,
            run,
            runAsyncState,
            mode
          );

          if (!rerenderStatusConfig[newState.status]) {
            return;
          }

          const {areEqual} = configuration;
          if (!areEqual(
            prevStateValue,
            calculatedState
          )) {
            setStateDeps(old => ({rerender: {}, guard: old.guard}));
          }
        },
        configuration.subscriptionKey
      );

      return function cleanup() {
        invokeIfPresent(unsubscribe);
      }

    },
    [asyncState, configuration.rerenderStatus, configuration.selector, configuration.areEqual]
  ); // dispose

  React.useEffect(
    function autoRun() {
      const shouldAutoRun = configuration.condition && !configuration.lazy;
      const cleanupFn = shouldAutoRun ? run() : undefined;
      return function cleanup() {
        invokeIfPresent(cleanupFn);
      }
    },
    dependencies
  );

  // attempt to dispose/reset old async state
  React.useEffect(
    function disposeOldAsyncState() {
      return function cleanup() {
        dispose()
      };
    },
    [dispose]
  );

  return factory.current.returnValue as UseAsyncStateReturnValue<T, E>;
}

// 1 x useMemo
// 1 x useContext
// 2 x useState
// 3 x useEffect
// 1 x useEffect (inside provider)
// const defaultDependencies = [];
// function v2<T, E>(
//   subscriptionConfig: ExtendedUseAsyncStateConfiguration<T, E>,
//   configOverrides: PartialUseAsyncStateConfiguration<T, E>,
//   dependencies: any[] = defaultDependencies,
// ):
//   UseAsyncStateReturnValue<T, E> {
// need a guard to trigger re-renders
// useState()

// subscribe to context
// useContext()

// read configuration
// useMemo: [...dependencies]
// infer async state instance

// declare a state snapshot initialized by the initial selected value
// useState
// const [returnValue, setReturnValue] = React.useState<UseAsyncStateReturnValue<T, E>>();

// subscribe to async state
// useEffect: [asyncState, selector, areEqual, rerenderStatus]

// run automatically, if necessary
// useEffect: [...dependencies]

// dispose async state
// useEffect: [the dispose function related to async state instance]
// this is important to be separate from the subscribe, because mentally, they do not have same dependencies
// this means, we dispose only when we no longer want to use the async state

// if inside provider: watch over the async state
// useEffect: [mode, key]
// check if the effect should do a no-op early

// give returnValue

// }

// remote async state
// subscribes to external source of events, or sets up a connexion (context) so that future
// producer runs will have that context; and also have a post connect handler to


/**
 *
 * state; remoteState
 *
 * {
 *   connect(onConnect, onFail): ctx {
 *     returns disconnect function
 *   }
 *   postConnect(ctx) {
 *
 *   }
 *   run(props) {
 *
 *   }
 *   runRemote(props, ctx) {
 *
 *   }
 * }
 *
 * {
 *   state,
 *   remoteState,
 *
 *   read() {},
 *   readRemote() {},
 *
 *   disconnect() {}
 * }
 *
 * {
 *   producer,
 *   remoteProducer,
 *
 *   connect,
 *   postConnect,
 *
 *   disconnect,
 * }
 *
 *
 * - when on connect is called (promise resolve), the remote state is marked as connected
 * - after the onConnect and shift to connected state, postConnect is called receiving the ctx props
 *   ctx should contain the following
 *      - run(props, ctx)
 *
 *
 *
 * {
 *   connect(props) {
 *     const client = wsClient(props.url, props.username, props.password)
 *     client.connect().then(props.onConnect, props.onError)
 *     return client
 *   }
 *
 *   postConnect(props, ctx) {
 *     return ctx.client.subscribe(topic, props.run)
 *   }
 *
 *   disconnect(props, ctx) {
 *     ctx.client.disconnect()
 *   }
 * }
 *
 *
 * useRemoteAsyncState({
 *   key: ws-conversation-12,
 *   postConnect(, ctx) {
 *     ctx.client.subscribe
 *   }
 * })
 *
 *
 */
