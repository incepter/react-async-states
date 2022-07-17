import * as React from "react";
import {
  __DEV__,
  invokeIfPresent,
  isFn,
  oneObjectIdentity,
  readProducerConfigFromSubscriptionConfig,
  shallowClone,
  shallowEqual
} from "shared";
import {AsyncStateContext} from "../context";
import {
  AsyncStateContextValue,
  AsyncStateSubscriptionMode,
  CleanupFn,
  MemoizedUseAsyncStateRef,
  PartialUseAsyncStateConfiguration,
  SubscribeEventProps,
  UseAsyncState,
  UseAsyncStateConfig,
  UseAsyncStateConfiguration,
  UseAsyncStateContextType,
  UseAsyncStateEventFn,
  UseAsyncStateEvents,
  UseAsyncStateEventSubscribe,
  UseAsyncStateSubscriptionInfo,
  useSelector
} from "../types.internal";
import AsyncState, {
  AbortFn,
  AsyncStateInterface,
  AsyncStateKey,
  AsyncStateSource,
  AsyncStateStatus,
  State
} from "../async-state";
import {nextKey} from "./utils/key-gen";
import {
  warnInDevAboutIrrelevantUseAsyncStateConfiguration
} from "../helpers/configuration-warn";
import {readAsyncStateFromSource} from "../async-state/read-source";
import {standaloneRunExtraPropsCreator} from "../helpers/run-props-creator";
import {supportsConcurrentMode} from "../helpers/supports-concurrent-mode";
import {isAsyncStateSource} from "../async-state/utils";

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
      !asyncState ||
      asyncState &&
      memoizedRef.subscriptionInfo &&
      memoizedRef.subscriptionInfo.asyncState !== subscriptionInfo.asyncState
    ) {

      // whenever we have an async state instance,
      // we will check if the calculated state from the new one
      // is in conflict with the last updated value. if yes set it
      ensureSubscriptionStateIsLatest(
        asyncState,
        mode,
        configuration,
        run,
        selectedValue.state,
        setSelectedValue,
      );
    }

    memoizedRef.subscriptionInfo = subscriptionInfo;
  }

  if (memoizedRef.latestData !== selectedValue.state) {
    memoizedRef.latestData = selectedValue.state;
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
      () => memoizedRef.latestData,
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


// useContext
// useRef
// useState
// useEffect
export function useSource<T>(
  source: AsyncStateSource<T>
): UseAsyncState<T, State<T>> {
  const contextValue = React.useContext(AsyncStateContext);
  const asyncState = readAsyncStateFromSource(source);
  const latestState = React.useRef<State<T>>()


  // declare a state snapshot initialized by the initial selected value
  // useState
  const [selectedValue, setSelectedValue] = React
    .useState<Readonly<UseAsyncState<T, State<T>>>>(initialize);

  if (latestState.current !== selectedValue.state) {
    latestState.current = selectedValue.state;
  }

  // subscribe to async state
  React.useEffect(subscribeToAsyncState, [asyncState]);

  return selectedValue;

  function initialize(): Readonly<UseAsyncState<T, State<T>>> {
    return makeUseAsyncStateReturnValue(
      asyncState,
      readStateFromAsyncState(asyncState, oneObjectIdentity),
      source.key,
      runAsyncStateSubscriptionFn(
        AsyncStateSubscriptionMode.SOURCE,
        asyncState,
        contextValue
      ),
      AsyncStateSubscriptionMode.SOURCE
    );

  }

  function subscribeToAsyncState() {
    let runFn = runAsyncStateSubscriptionFn(
      AsyncStateSubscriptionMode.SOURCE,
      asyncState,
      contextValue
    );
    const configuration = constructUseSourceDefaultConfig(source);
    return useAsyncStateSubscribeFn(
      asyncState,
      AsyncStateSubscriptionMode.SOURCE,
      configuration,
      () => latestState.current,
      setSelectedValue,
      runFn,
    );
  }
}

//region configuration parsing


const sourceConfigurationSecretSymbol = Symbol();

const defaultUseASConfig = Object.freeze({
  lazy: true,
  condition: true,

  areEqual: shallowEqual,
  selector: oneObjectIdentity,
});

// userConfig is the config the developer wrote
function readUserConfiguration<T, E>(
  userConfig: UseAsyncStateConfig<T, E>,
  overrides?: PartialUseAsyncStateConfiguration<T, E>
): UseAsyncStateConfiguration<T, E> {
  // this is direct anonymous producer configuration
  if (isFn(userConfig)) {
    return Object.assign(
      {},
      defaultUseASConfig,
      overrides,
      {producer: userConfig}
    );
  }
  // subscription to a state inside provider by key (or wait)
  // or a standalone outside provider with an undefined producer
  if (typeof userConfig === "string") {
    return Object.assign(
      {},
      defaultUseASConfig,
      overrides,
      {key: userConfig}
    );
  }
  // subscription via source directly as configuration
  if (isAsyncStateSource(userConfig)) {
    return Object.assign(
      {},
      defaultUseASConfig,
      overrides,
      {source: userConfig, [sourceConfigurationSecretSymbol]: true}
    );
  }
  // subscription via source using object configuration
  if (
    isAsyncStateSource((userConfig as UseAsyncStateConfiguration<T, E>)?.source)
  ) {
    return Object.assign(
      {},
      defaultUseASConfig,
      userConfig,
      overrides,
      {
        [sourceConfigurationSecretSymbol]: true
      }
    );
  }
  // @ts-ignore
  if (isFn(userConfig?.postSubscribe)) {
    console.error("[Deprecation warning] - postSubscribe was removed from the library." +
      " Please use events.subscribe instead.");
  }
  return Object.assign(
    {},
    defaultUseASConfig,
    overrides,
    userConfig
  );
}

function constructUseSourceDefaultConfig<T>(
  source: AsyncStateSource<T>,
): UseAsyncStateConfiguration<T, State<T>> {
  return Object.freeze(Object.assign({key: source.key,}, defaultUseASConfig));
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

function runAsyncStateSubscriptionFn<T, E>(
  mode: AsyncStateSubscriptionMode,
  asyncState: AsyncStateInterface<T>,
  contextValue: UseAsyncStateContextType
): (...args: any[]) => AbortFn {
  return function run(...args) {
    switch (mode) {
      case AsyncStateSubscriptionMode.SOURCE:
      case AsyncStateSubscriptionMode.STANDALONE:
      case AsyncStateSubscriptionMode.SOURCE_FORK:
        return contextValue !== null ?
          contextValue.run(
            asyncState,
            ...args
          )
          :
          asyncState.run(standaloneRunExtraPropsCreator, ...args);
      case AsyncStateSubscriptionMode.OUTSIDE_PROVIDER:
        return asyncState.run(standaloneRunExtraPropsCreator, ...args);
      case AsyncStateSubscriptionMode.FORK:
      case AsyncStateSubscriptionMode.HOIST:
      case AsyncStateSubscriptionMode.LISTEN: {
        return (contextValue as AsyncStateContextValue).run(
          asyncState,
          ...args
        );
      }
      // NoOp - should not happen
      case AsyncStateSubscriptionMode.NOOP:
      case AsyncStateSubscriptionMode.WAITING:
      default:
        return undefined;
    }
  };
}

function disposeAsyncStateSubscriptionFn<T, E>(
  mode: AsyncStateSubscriptionMode,
  asyncState: AsyncStateInterface<T>,
  contextValue: UseAsyncStateContextType
): () => (boolean | undefined) {
  return function dispose() {
    switch (mode) {
      case AsyncStateSubscriptionMode.HOIST:
        return (contextValue as AsyncStateContextValue).dispose(asyncState);
      // NoOp - should not happen
      case AsyncStateSubscriptionMode.SOURCE:
      case AsyncStateSubscriptionMode.SOURCE_FORK:
      case AsyncStateSubscriptionMode.LISTEN:
      case AsyncStateSubscriptionMode.FORK:
      case AsyncStateSubscriptionMode.STANDALONE:
      case AsyncStateSubscriptionMode.OUTSIDE_PROVIDER:
      case AsyncStateSubscriptionMode.NOOP:
      case AsyncStateSubscriptionMode.WAITING:
      default:
        return undefined;
    }
  };
}


function inferAsyncStateInstance<T, E>(
  mode: AsyncStateSubscriptionMode,
  configuration: UseAsyncStateConfiguration<T, E>,
  contextValue: UseAsyncStateContextType
): AsyncStateInterface<T> {
  const candidate = contextValue
    ?.get(configuration.key as string) as AsyncStateInterface<T>;

  switch (mode) {
    case AsyncStateSubscriptionMode.FORK:
      // @ts-ignore
      // contextValue is not null here, because we decide the mode based on it!
      return contextValue.fork(
        configuration.key as string,
        configuration.forkConfig
      ) as AsyncStateInterface<T>;
    case AsyncStateSubscriptionMode.HOIST:
      const {
        key,
        producer,
        runEffect,
        cacheConfig,
        initialValue,

        skipPendingDelayMs,
        runEffectDurationMs,
        resetStateOnDispose,
        hoistToProviderConfig
      } = configuration;
      // @ts-ignore
      // contextValue is not null here, because we decide the mode based on it!
      return contextValue.hoist({
        key: key as AsyncStateKey,
        producer,
        runEffect,
        cacheConfig,
        initialValue,
        skipPendingDelayMs,
        resetStateOnDispose,
        runEffectDurationMs,
        hoistToProviderConfig,
      });
    case AsyncStateSubscriptionMode.LISTEN:
      return candidate;
    case AsyncStateSubscriptionMode.STANDALONE:
    case AsyncStateSubscriptionMode.OUTSIDE_PROVIDER:
      return new AsyncState(
        configuration.key as AsyncStateKey,
        configuration.producer,
        readProducerConfigFromSubscriptionConfig(configuration)
      );
    case AsyncStateSubscriptionMode.SOURCE:
      return readAsyncStateFromSource(
        configuration.source as AsyncStateSource<T>);
    case AsyncStateSubscriptionMode.SOURCE_FORK: {
      const sourceAsyncState = readAsyncStateFromSource(
        configuration.source as AsyncStateSource<T>);
      return sourceAsyncState.fork(configuration.forkConfig);
    }
    case AsyncStateSubscriptionMode.NOOP:
    case AsyncStateSubscriptionMode.WAITING:
      // @ts-ignore
      return null;
    default:
      return candidate;
  }
}

//endregion

//region subscription functions

function inferSubscriptionMode<T, E>(
  contextValue: UseAsyncStateContextType,
  configuration: UseAsyncStateConfiguration<T, E>
): AsyncStateSubscriptionMode {
  // the subscription via source passes directly
  if (configuration[sourceConfigurationSecretSymbol] === true) {
    return configuration.fork
      ?
      AsyncStateSubscriptionMode.SOURCE_FORK
      :
      AsyncStateSubscriptionMode.SOURCE;
  }

  if (contextValue === null) {
    return AsyncStateSubscriptionMode.OUTSIDE_PROVIDER;
  }

  const {key, fork, hoistToProvider, producer} = configuration;
  if (key === undefined && configuration.source?.key === undefined) {
    return AsyncStateSubscriptionMode.STANDALONE;
  }

  const existsInProvider = !!contextValue.get(key as AsyncStateKey);

  // early decide that this is a listener and return it immediately
  // because this is the most common use case that it will be
  // we'll be optimizing this path first
  if (existsInProvider && !hoistToProvider && !fork) {
    return AsyncStateSubscriptionMode.LISTEN;
  }

  // we dont want to hoist or fork
  if (!hoistToProvider && !fork && producer) {
    return AsyncStateSubscriptionMode.STANDALONE;
  }

  // we want to hoist while (not in provider or we dont want to fork)
  if (hoistToProvider && (!existsInProvider || !fork)) {
    return AsyncStateSubscriptionMode.HOIST;
  }

  // fork a hoisted
  // the provider will hoist it again
  if (fork && existsInProvider) {
    return AsyncStateSubscriptionMode.FORK;
  }

  // not found in provider; so either a mistake, or still not hoisted from
  if (!existsInProvider) {
    // waiting, or may be we should throw ?
    return AsyncStateSubscriptionMode.WAITING;
  }

  return AsyncStateSubscriptionMode.NOOP; // we should not be here
}


function shouldRecalculateInstance<T, E>(
  newConfig: UseAsyncStateConfiguration<T, E>,
  newMode: AsyncStateSubscriptionMode,
  newGuard: Object,
  oldSubscriptionInfo: UseAsyncStateSubscriptionInfo<T, E> | undefined
): boolean {
  // here we check on relevant information to decide on the asyncState instance
  return !oldSubscriptionInfo ||
    newGuard !== oldSubscriptionInfo.guard ||
    newMode !== oldSubscriptionInfo.mode ||
    newConfig.producer !== oldSubscriptionInfo.configuration.producer ||
    newConfig.key !== oldSubscriptionInfo.configuration.key ||
    newConfig.source !== oldSubscriptionInfo.configuration.source ||
    newConfig.lane !== oldSubscriptionInfo.configuration.lane ||

    newConfig.fork !== oldSubscriptionInfo.configuration.fork ||
    newConfig.resetStateOnDispose !== oldSubscriptionInfo.configuration.resetStateOnDispose ||
    newConfig.forkConfig?.keepState !== oldSubscriptionInfo.configuration.forkConfig?.keepState ||

    newConfig.hoistToProvider !== oldSubscriptionInfo.configuration.hoistToProvider ||
    newConfig.hoistToProviderConfig?.override !== oldSubscriptionInfo.configuration.hoistToProviderConfig?.override;
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
  getCurrentValue: () => E,
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

  ensureSubscriptionStateIsLatest(
    asyncState,
    mode,
    configuration,
    run,
    getCurrentValue(),
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

function ensureSubscriptionStateIsLatest<T, E = State<T>>(
  asyncState: AsyncStateInterface<T>,
  mode: AsyncStateSubscriptionMode,
  configuration: UseAsyncStateConfiguration<T, E>,
  run: (...args: any[]) => AbortFn,
  oldValue: E,
  update: (value: React.SetStateAction<Readonly<UseAsyncState<T, E>>>) => void,
) {
  const {key, selector, areEqual} = configuration;

  const renderValue = oldValue;
  const newState = (asyncState ? readStateFromAsyncState(asyncState, selector) : undefined) as E;

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

function readStateFromAsyncState<T, E = State<T>>(
  asyncState: AsyncStateInterface<T>,
  selector: useSelector<T, E>
): E {
  return selector(asyncState.currentState, asyncState.lastSuccess, asyncState.cache);
}

//endregion

//region useAsyncState value construction
// @ts-ignore
function noop() {
  // that's a noop fn
}

function makeUseAsyncStateReturnValue<T, E>(
  asyncState: AsyncStateInterface<T>,
  stateValue: E,
  configurationKey: AsyncStateKey,
  run: (...args: any[]) => AbortFn,
  mode: AsyncStateSubscriptionMode
): Readonly<UseAsyncState<T, E>> {

  if (!asyncState) {
    return Object.freeze({
      mode,
      abort: noop,
      payload: null,
      state: stateValue,
      replaceState: noop,
      mergePayload: noop,
      uniqueId: undefined,
      key: configurationKey,
      invalidateCache: noop,

      read() {
        return stateValue;
      },
      run(...args: any[]): AbortFn {
        return undefined;
      },
    });
  }

  return Object.freeze({
    mode,
    key: asyncState.key,
    source: asyncState._source,
    payload: asyncState.payload,

    uniqueId: asyncState.uniqueId,

    state: stateValue,
    lastSuccess: asyncState.lastSuccess,
    read: createReadInConcurrentMode(asyncState, stateValue),

    mergePayload(newPayload) {
      asyncState.payload = shallowClone(
        asyncState.payload,
        newPayload
      );
    },

    abort: asyncState.abort.bind(asyncState),
    replaceState: asyncState.replaceState.bind(asyncState),
    run: isFn(run) ? run : asyncState.run.bind(asyncState, standaloneRunExtraPropsCreator),
    invalidateCache: asyncState.invalidateCache.bind(asyncState),
  });
}


let didWarnAboutUnsupportedConcurrentFeatures = false;

function createReadInConcurrentMode<T, E>(
  asyncState: AsyncStateInterface<T>,
  stateValue: E
) {
  return function readInConcurrentMode() {
    if (supportsConcurrentMode()) {
      if (
        AsyncStateStatus.pending === asyncState.currentState?.status &&
        asyncState.suspender
      ) {
        throw asyncState.suspender;
      }
    } else {
      if (__DEV__) {
        if (!didWarnAboutUnsupportedConcurrentFeatures) {
          console.error(
            "[Warning] You are calling useAsyncState().read() without having" +
            " react 18 or above. If the library throws, you will get an error" +
            " in your app. You will be receiving the state value without" +
            " any suspension.Please consider upgrading to " +
            "react 18 or above to use concurrent features."
          );
          didWarnAboutUnsupportedConcurrentFeatures = true;
        }
      }
    }
    return stateValue;
  }
}

//endregion
