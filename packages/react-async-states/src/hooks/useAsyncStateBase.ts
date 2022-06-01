import * as React from "react";
import {__DEV__, invokeIfPresent, shallowClone} from "shared";
import {AsyncStateContext} from "../context";
import {
  inferAsyncStateInstance,
  inferSubscriptionMode,
  makeUseAsyncStateReturnValue,
  shouldRecalculateInstance
} from "./utils/subscriptionUtils";
import {readUserConfiguration} from "./utils/readConfig";
import {
  disposeAsyncStateSubscriptionFn,
  runAsyncStateSubscriptionFn
} from "./utils/asyncStateSubscription";
import {
  AsyncStateContextValue,
  AsyncStateSubscriptionMode,
  CleanupFn,
  MemoizedUseAsyncStateRef,
  PartialUseAsyncStateConfiguration,
  SubscribeEventProps,
  UseAsyncState,
  UseAsyncStateConfig, UseAsyncStateConfiguration,
  UseAsyncStateEventFn, UseAsyncStateEvents, UseAsyncStateEventSubscribe,
  UseAsyncStateSubscriptionInfo,
  useSelector
} from "../types.internal";
import {
  AbortFn,
  AsyncStateInterface,
  AsyncStateKey,
  AsyncStateSource,
  State
} from "../async-state";
import {nextKey} from "./utils/key-gen";
import {
  warnInDevAboutIrrelevantUseAsyncStateConfiguration
} from "../helpers/configuration-warn";

const defaultDependencies: any[] = [];

export const useAsyncStateBase = function useAsyncStateImpl<T, E = State<T>>(
  subscriptionConfig: UseAsyncStateConfig<T, E>,
  dependencies: any[] = defaultDependencies,
  configOverrides?: PartialUseAsyncStateConfiguration<T, E>,
): UseAsyncState<T, E> {

  // need a guard to trigger re-renders
  const [guard, setGuard] = React.useState<number>(0);

  // subscribe to context
  const contextValue = React.useContext(AsyncStateContext);
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

  const {run, mode, asyncState, configuration, dispose} = subscriptionInfo;
  const {selector, areEqual, events} = configuration;


  // declare a state snapshot initialized by the initial selected value
  // useState
  const [selectedValue, setSelectedValue] = React
    .useState<Readonly<UseAsyncState<T, E>>>(initialize);

  // this memo reference inequality means that
  // the memo has a new configuration, because either
  // dependencies changed, or guard changed.
  if (memoizedRef.subscriptionInfo !== subscriptionInfo) {
    // this means:
    // if we already rendered, but this time, the async state instance changed
    // for some of many possible reasons.
    if (
      asyncState &&
      memoizedRef.subscriptionInfo &&
      memoizedRef.subscriptionInfo.asyncState !== subscriptionInfo.asyncState
    ) {

      // whenever we have an async state instance,
      // we will check if the calculated state from the new one
      // is in conflict with the last updated value. if yes set it
      makeSureSubscriptionStateIsLatest(
        asyncState,
        mode,
        configuration,
        run,
        selectedValue,
        setSelectedValue,
      );
    }

    memoizedRef.subscriptionInfo = subscriptionInfo;
  }

  // if inside provider: watch over the async state
  // useEffect: [mode, key]
  // check if the effect should do a no-op early
  if (isInsideProvider) {
    React.useEffect(
      watchAsyncState,
      [mode, configuration.key]
    )
  }

  // subscribe to async state
  React.useEffect(subscribeToAsyncState, [
    areEqual,
    selector,
    asyncState,
    events?.change,
    events?.subscribe,
    configuration.subscriptionKey
  ]);

  // run automatically, if necessary
  React.useEffect(autoRunAsyncState, dependencies);

  return selectedValue;

  function initialize(): Readonly<UseAsyncState<T, E>> {
    return makeUseAsyncStateReturnValue(
      asyncState,
      (asyncState ? readStateFromAsyncState(asyncState, selector) : undefined) as E,
      configuration.key as AsyncStateKey,
      run,
      mode
    );

  }

  function createMemoizedRef(): MemoizedUseAsyncStateRef<T, E> {
    return Object.create(null);
  }

  function autoRunAsyncState(): CleanupFn {
    // auto run only if condition is met and it is not lazy
    const shouldAutoRun = configuration.condition && !configuration.lazy;
    // if dependencies change, if we run, the cleanup shall abort
    return shouldAutoRun ? run() : undefined;
  }

  function subscribeToAsyncState() {
    return useAsyncStateSubscribeFn(
      asyncState,
      mode,
      configuration,
      selectedValue,
      setSelectedValue,
      run,
    );
  }

  function watchAsyncState() {
    return watchOverAsyncState(
      asyncState,
      contextValue,
      mode,
      configuration,
      setGuard,
      dispose
    );
  }

  function parseConfiguration() {
    return parseUseAsyncStateConfiguration(
      subscriptionConfig,
      contextValue,
      guard,
      memoizedRef,
      dependencies,
      configOverrides
    );
  }
}

function watchOverAsyncState<T, E = State<T>>(
  asyncState: AsyncStateInterface<T>,
  contextValue: AsyncStateContextValue | null,
  mode: AsyncStateSubscriptionMode,
  configuration: UseAsyncStateConfiguration<T, E>,
  setGuard: (value: React.SetStateAction<number>) => void,
  dispose: (() => (boolean | undefined)),
) {
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
  if (mode === AsyncStateSubscriptionMode.WAITING) {
    let candidate = contextValue.get(configuration.key as AsyncStateKey);
    if (candidate) {
      if (!asyncState || candidate !== asyncState) {
        // schedule the recalculation of the memo
        setGuard(old => old + 1);
        return;
      }
    }

  }

  // if this component is the one hoisting a state,
  // re-notify watchers that may missed the notification for some reason
  // this case is not likely to occur,
  // but this is like a safety check that notify the watchers
  // and quit because i don't think the hoister should watch over itself
  if (mode === AsyncStateSubscriptionMode.HOIST) {
    // when we are hoisting, since we notify again, better execute
    // the whole hoist again without overriding it
    // and make sure the returned one is the subscribed
    const newHoist = inferAsyncStateInstance(
      mode,
      shallowClone(
        configuration,
        {
          hoistToProviderConfig:
            shallowClone(
              configuration.hoistToProviderConfig, {override: false}
            )
        }),
      contextValue
    );
    if (newHoist !== asyncState) {
      setGuard(old => old + 1);
    } else {
      return function disposeOld() {
        dispose();
      }
    }
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

function useAsyncStateSubscribeFn<T, E = State<T>>(
  asyncState: AsyncStateInterface<T>,
  mode: AsyncStateSubscriptionMode,
  configuration: UseAsyncStateConfiguration<T, E>,
  actualValue: Readonly<UseAsyncState<T, E>>,
  update: (value: React.SetStateAction<Readonly<UseAsyncState<T, E>>>) => void,
  run: (...args: any[]) => AbortFn,
): CleanupFn {
  if (!asyncState) {
    return undefined;
  }

  const {selector, areEqual, events} = configuration;

  let didClean = false;
  // the subscribe function returns the unsubscribe function
  const unsubscribe = asyncState.subscribe(
    function onUpdate(nextState: State<T>) {
      if (didClean) {
        return;
      }
      // when we get an update from this async state, we recalculate
      // the selected value.
      const newState = readStateFromAsyncState(asyncState, selector);

      update(old => {
        return areEqual(old.state, newState)
          ? old
          :
          makeUseAsyncStateReturnValue(
            asyncState,
            newState,
            configuration.key as AsyncStateKey,
            run,
            mode
          )
      });

      // if there are any change listeners: invoke them
      invokeChangeEvents(nextState, events);

    },
    configuration.subscriptionKey
  );

  let postUnsubscribe: CleanupFn[] | null = null;
  if (events?.subscribe) {
    postUnsubscribe = invokeSubscribeEvents(
      events.subscribe,
      {
        run,
        mode,
        getState: () => asyncState.currentState,
        invalidateCache: asyncState.invalidateCache.bind(asyncState),
      }
    );
  }

  makeSureSubscriptionStateIsLatest(
    asyncState,
    mode,
    configuration,
    run,
    actualValue,
    update,
  );

  return function cleanup() {
    didClean = true;

    if (postUnsubscribe) {
      postUnsubscribe.forEach(fn => invokeIfPresent(fn))
    }
    (unsubscribe as () => void)();
  }
}


function invokeChangeEvents<T>(
  nextState: State<T>,
  events: UseAsyncStateEvents<T> | undefined
) {
  if (!events?.change) {
    return;
  }

  const changeHandlers: UseAsyncStateEventFn<T>[]
    = Array.isArray(events.change) ? events.change : [events.change];

  const eventProps = {state: nextState};

  changeHandlers.forEach(event => {
    if (typeof event === "object") {
      const {handler, status} = event;
      if (!status || nextState.status === status) {
        handler(eventProps);
      }
    } else {
      event(eventProps);
    }
  });
}


function invokeSubscribeEvents<T>(
  events: UseAsyncStateEventSubscribe<T>,
  eventProps: SubscribeEventProps<T>
): CleanupFn[] {

  let handlers: ((props: SubscribeEventProps<T>) => CleanupFn)[]
    = Array.isArray(events) ? events : [events];

  return handlers.map(handler => handler(eventProps));
}

function makeSureSubscriptionStateIsLatest<T, E = State<T>>(
  asyncState: AsyncStateInterface<T>,
  mode: AsyncStateSubscriptionMode,
  configuration: UseAsyncStateConfiguration<T, E>,
  run: (...args: any[]) => AbortFn,
  oldValue: Readonly<UseAsyncState<T, E>>,
  update: (value: React.SetStateAction<Readonly<UseAsyncState<T, E>>>) => void,
) {
  const {key, selector, areEqual} = configuration;

  const renderValue = oldValue?.state;
  const newState = readStateFromAsyncState(asyncState, selector)

  const actualValue = makeUseAsyncStateReturnValue(
    asyncState,
    newState,
    key as AsyncStateKey,
    run,
    mode
  );

  if (!areEqual(renderValue, actualValue.state)) {
    update(actualValue);
  }
}

function parseUseAsyncStateConfiguration<T, E = State<T>>(
  subscriptionConfig: UseAsyncStateConfig<T, E>,
  contextValue: AsyncStateContextValue | null,
  guard: number,
  memoizedRef: MemoizedUseAsyncStateRef<T, E>,
  dependencies: any[],
  configOverrides?: PartialUseAsyncStateConfiguration<T, E>,
): UseAsyncStateSubscriptionInfo<T, E> {

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

  if (__DEV__) {
    warnInDevAboutIrrelevantUseAsyncStateConfiguration(newMode, newConfig);
  }


  // in most of cases, the AsyncStateInterface could be reused and a new one
  // is not necessary.
  const recalculateInstance = shouldRecalculateInstance(
    newConfig,
    newMode,
    guard,
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

  if (newConfig.lane) {
    newAsyncState = newAsyncState.getLane(newConfig.lane);
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

function readStateFromAsyncState<T, E>(
  asyncState: AsyncStateInterface<T>,
  selector: useSelector<T, E>
): E {
  return selector(asyncState.currentState, asyncState.lastSuccess, asyncState.cache);
}


// remote async state
// subscribes to external source of events, or sets up a connexion (context) so that future
// producer runs will have that context; and also have a post connect handler to
