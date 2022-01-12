import * as React from "react";
import {invokeIfPresent} from "shared";
import {AsyncStateContext} from "../context";
import {
  inferAsyncStateInstance,
  inferSubscriptionMode,
  makeUseAsyncStateReturnValue,
  shouldRecalculateInstance
} from "./utils/subscriptionUtils";
import {nextKey, readUserConfiguration} from "./utils/readConfig";
import {
  disposeAsyncStateSubscriptionFn,
  runAsyncStateSubscriptionFn
} from "./utils/asyncStateSubscription";
import {
  AsyncStateSubscriptionMode,
  CleanupFn,
  ExtendedUseAsyncStateConfiguration,
  MemoizedUseAsyncStateRef,
  PartialUseAsyncStateConfiguration,
  UseAsyncStateReturnValue,
  UseAsyncStateSubscriptionInfo
} from "../types";
import {
  AsyncStateInterface,
  AsyncStateKey,
  AsyncStateSource,
  State
} from "../../../async-state";

// 2 x useMemo
// 1 x useContext
// 2 x useState
// 3 x useEffect
// 1 x useEffect (inside provider)
const defaultDependencies = [];

export const useAsyncStateImpl = function useAsyncStateImpl<T, E>(
  subscriptionConfig: ExtendedUseAsyncStateConfiguration<T, E>,
  dependencies: any[] = defaultDependencies,
  configOverrides?: PartialUseAsyncStateConfiguration<T, E>,
): UseAsyncStateReturnValue<T, E> {

  // need a guard to trigger re-renders
  const [guard, setGuard] = React.useState<number>(0);

  // subscribe to context
  const contextValue = React.useContext(AsyncStateContext);
  const runAsyncState = contextValue?.runAsyncState;
  const isInsideProvider = contextValue !== null;

  // this is similar to a ref, but will never get reset
  // it is used a mutable object between renders
  // and we only read/mutate it during render
  // this to grand old configuration to the parseConfiguration
  const memoizedRef = React.useMemo<MemoizedUseAsyncStateRef<T, E>>(
    createMemoizedRef,
    []
  );
  // read configuration
  // useMemo: [...dependencies]
  // infer async state instance
  const subscriptionInfo = React.useMemo<UseAsyncStateSubscriptionInfo<T, E>>(
    parseConfiguration,
    [guard, ...dependencies]
  );

  if (memoizedRef.subscriptionInfo !== subscriptionInfo) {
    memoizedRef.subscriptionInfo = subscriptionInfo;
  }

  const {run, mode, asyncState, configuration, dispose} = subscriptionInfo;
  const {selector, areEqual} = configuration;

  // declare a state snapshot initialized by the initial selected value
  // useState
  const [selectedValue, setSelectedValue] = React
    .useState<Readonly<UseAsyncStateReturnValue<T, E>>>(initialize);

  // subscribe to async state
  // useEffect: [asyncState, selector, areEqual]
  React.useEffect(subscribeToAsyncState, [asyncState, selector, areEqual]);

  // run automatically, if necessary
  // useEffect: [...dependencies]

  React.useEffect(autoRunAsyncState, dependencies);

  // dispose
  // async state
  // useEffect: [the dispose function related to async state instance]
  // this is important to be separate from the subscribe
  // because mentally, they do not have same dependencies
  // this means, we dispose only when we no longer want to use the async state
  React.useEffect(disposeOldAsyncState, [dispose]);

  // if inside provider: watch over the async state
  // useEffect: [mode, key]
  // check if the effect should do a no-op early

  if (isInsideProvider) {
    React.useEffect(
      watchOverAsyncState,
      [mode, configuration.key]
    )
  }

  return selectedValue;

  // give selectedValue

  function initialize(): Readonly<UseAsyncStateReturnValue<T, E>> {
    return makeUseAsyncStateReturnValue(
      asyncState,
      asyncState ? readStateFromAsyncState(asyncState, selector) : undefined,
      configuration.key as AsyncStateKey,
      run,
      runAsyncState,
      mode
    );

  }

  function createMemoizedRef(): MemoizedUseAsyncStateRef<T, E> {
    return Object.create(null);
  }


  function parseConfiguration(): UseAsyncStateSubscriptionInfo<T, E> {

    // read the new used configuration
    const newConfig = readUserConfiguration(subscriptionConfig, configOverrides);
    // detect the new mode based on configuration
    const newMode = inferSubscriptionMode(contextValue, newConfig);

    // in case of an undefined key
    // we attempt to read it from the source if we are in source modes
    // or else create a default anonymous one
    if (newConfig.key === undefined) {
      if (
        newMode === AsyncStateSubscriptionMode.SOURCE ||
        newMode === AsyncStateSubscriptionMode.SOURCE_FORK
      ) {
        newConfig.key = (newConfig.source as AsyncStateSource<T>).key;
      } else {
        newConfig.key = nextKey();
      }
    }

    // in most of cases, the AsyncStateInterface could be reused and a new one
    // is not necessary.
    const recalculateInstance = shouldRecalculateInstance(
      newConfig,
      newMode,
      guard,
      dependencies,
      memoizedRef.subscriptionInfo
    );

    let newAsyncState: AsyncStateInterface<T>;

    // if we should recalculate the instance, we infer it
    // or else we reuse the last used one
    if (recalculateInstance) {
      newAsyncState = inferAsyncStateInstance(
        newMode,
        newConfig,
        contextValue
      );
    } else {
      newAsyncState = memoizedRef.subscriptionInfo.asyncState;
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

    return output;
  }

  function subscribeToAsyncState(): CleanupFn {
    if (!asyncState) {
      return undefined;
    }

    let didClean = false;
    // the subscribe function returns the unsubscribe function
    const unsubscribe = asyncState.subscribe(
      function onUpdate() {
        if (didClean) {
          return;
        }
        // when we get an update from this async state, we recalculate
        // the snapshot value.
        const newState = readStateFromAsyncState(asyncState, selector);

        // the as E used here is to bypass the warning about old may be undefined
        // in fact, it may be undefined in two cases: mode is Waiting or Noop
        // this means we aren't connected to an async state,
        // we will add a warning here telling that the selector will receive
        // undefined values in these modes
        setSelectedValue(old => {
          return areEqual(old.state, newState)
            ? old
            :
            makeUseAsyncStateReturnValue(
              asyncState,
              newState,
              configuration.key as AsyncStateKey,
              run,
              runAsyncState,
              mode
            )
        });
      },
      configuration.subscriptionKey
    );
    return function cleanup() {
      didClean = true;
      (unsubscribe as () => void)();
    }
  }

  function autoRunAsyncState(): CleanupFn {
    // auto run only if condition is met and it is not lazy
    const shouldAutoRun = configuration.condition && !configuration.lazy;
    // if dependencies change, if we run, the cleanup shall abort
    return shouldAutoRun ? run() : undefined;
  }

  function disposeOldAsyncState(): CleanupFn {
    // dispose is a function that disconnects from the async state
    // and tell is to dispose; it then checks if it has no subscribers and resets
    // it to its initial state
    return dispose;
  }

  function saveOldSubscriptionInfo() {
    return subscriptionInfo;
  }

  function watchOverAsyncState() {
    if (contextValue === null) {
      throw new Error("watchOverAsyncState is called outside the provider." +
        " This is a bug, please fill an issue.");
    }
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
        setGuard(old => old + 1);
        return;
      }
    }

    // if this component is the one hoisting a state,
    // re-notify watchers that may missed the notification for some reason
    // this case is not likely to occur,
    // but this is like a safety check that notify the watchers
    // and quit because i don't think the hoister should watch over itself
    if (mode === AsyncStateSubscriptionMode.HOIST) {
      contextValue.notifyWatchers(
        asyncState.key,
        asyncState
      );
      return;
    }

    if (
      mode === AsyncStateSubscriptionMode.WAITING ||
      mode === AsyncStateSubscriptionMode.LISTEN
    ) {
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
            setGuard(old => old + 1);
          }
        }
      );
      return function cleanup() {
        didClean = true;
        invokeIfPresent(unwatch);
      };
    }

    return undefined;
  }
}

function readStateFromAsyncState<T, E>(
  asyncState: AsyncStateInterface<T>,
  selector: (currentState: State<T>, lastSuccess: State<T>) => E
): E {
  return selector(asyncState.currentState, asyncState.lastSuccess);
}

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
