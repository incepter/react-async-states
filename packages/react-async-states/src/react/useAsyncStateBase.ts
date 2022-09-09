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
import {AsyncStateContext} from "./context";
import {
  AsyncStateContextValue,
  AsyncStateSubscriptionMode,
  CleanupFn,
  UseAsyncStateRef,
  PartialUseAsyncStateConfiguration,
  SubscribeEventProps,
  UseAsyncState,
  UseAsyncStateConfig,
  UseAsyncStateConfiguration,
  UseAsyncStateContextType,
  UseAsyncStateEventFn,
  UseAsyncStateEvents,
  UseAsyncStateEventSubscribe,
  SubscriptionInfo,
  useSelector
} from "../types.internal";
import AsyncState, {
  AbortFn,
  AsyncStateInterface,
  AsyncStateKey,
  AsyncStateSource,
  AsyncStateStatus, Producer,
  State
} from "../async-state";
import {nextKey} from "../async-state/key-gen";
import {
  warnInDevAboutIrrelevantUseAsyncStateConfiguration
} from "./helpers/configuration-warn";
import {supportsConcurrentMode} from "./helpers/supports-concurrent-mode";
import {isAsyncStateSource} from "../async-state/utils";
import {
  readAsyncStateFromSource,
  standaloneProducerEffectsCreator
} from "../async-state/AsyncState";

const defaultDependencies: any[] = [];
export const useAsyncStateBase = function useAsyncStateImpl<T, E = State<T>>(
  subscriptionConfig: UseAsyncStateConfig<T, E>,
  deps: any[] = defaultDependencies,
  configOverrides?: PartialUseAsyncStateConfiguration<T, E>,
): UseAsyncState<T, E> {

  // When inside provider, the subscribed instance might change
  // this gard serves to trigger the memo recalculation
  const [guard, setGuard] = React.useState<number>(0);
  const contextValue = React.useContext(AsyncStateContext);
  // this is similar to a ref, it is used a mutable object between renders
  // Besides a ref (that may get reset according to the rumors), this won't
  // get reset . And can keep track of the old configuration
  // and pass it to the parseConfiguration function.
  // We only mutate this during render, and we only assign a value to it if different
  const selfMemo = React
    .useMemo<UseAsyncStateRef<T, E>>(createEmptyObject, []);

  const subscriptionInfo = React
    .useMemo<SubscriptionInfo<T, E>>(parseConfiguration, [guard, ...deps]);

  const {run, mode, asyncState, configuration} = subscriptionInfo;
  const {selector, areEqual, events} = configuration;

  const [selectedValue, setSelectedValue] = React
    .useState<Readonly<UseAsyncState<T, E>>>(calculateStateValue);

  // this reference inequality means that memo has been recalculated
  if (selfMemo.subscriptionInfo !== subscriptionInfo) {
    selfMemo.subscriptionInfo = subscriptionInfo;
  }

  if (
    selectedValue.version !== asyncState?.version ||
    selectedValue.source !== subscriptionInfo.asyncState?._source
  ) {
    updateSelectedValue();
  }

  if (selfMemo.latestData !== selectedValue.state) {
    selfMemo.latestData = selectedValue.state;
  }
  if (selfMemo.latestVersion !== selectedValue.version) {
    selfMemo.latestVersion = selectedValue.version;
  }
  // if inside provider: watch over the async state
  // check if the effect should do a no-op early
  // this hook is safe to be inside this precise condition, which, if changed
  // react during reconciliation would throw the old tree to GC.
  // omitting context because we only manipulate get, dispose and some other
  // functions which are safe to be excluded from dependencies and never change
  // omitting dispose fn because it depends on from the mode and whether inside provider
  if (contextValue !== null) {
    React.useEffect(watchAsyncState, [mode, asyncState, configuration]);
  }

  React.useEffect(subscribeToAsyncState,
    [configuration.subscriptionKey, areEqual, selector, asyncState, events]);

  React.useEffect(autoRunAsyncState, deps);

  return selectedValue;

  function calculateStateValue(): Readonly<UseAsyncState<T, E>> {
    const newValue = (asyncState ? readStateFromAsyncState(asyncState, selector) : undefined) as E;

    const newState = shallowClone(subscriptionInfo.baseReturn);
    newState.read = createReadInConcurrentMode(asyncState, newValue);
    newState.state = newValue;
    newState.version = asyncState?.version;
    newState.lastSuccess = asyncState?.lastSuccess;
    return newState;
  }

  function updateSelectedValue() {
    setSelectedValue(calculateStateValue());
    selfMemo.latestVersion = asyncState?.version;
  }

  function parseConfiguration() {
    return parseUseAsyncStateConfiguration(
      subscriptionConfig,
      contextValue,
      guard,
      selfMemo,
      deps,
      configOverrides
    );
  }

  function autoRunAsyncState(): CleanupFn {
    // auto run only if condition is met, and it is not lazy
    const shouldAutoRun = configuration.condition && !configuration.lazy;
    // if dependencies change, if we run, the cleanup shall abort
    return shouldAutoRun ? run() : undefined;
  }

  function subscribeToAsyncState() {
    function onStateChange() {
      const newState = asyncState.currentState;
      const newSelectedState = readStateFromAsyncState(asyncState, selector);

      if (!areEqual(newSelectedState, selfMemo.latestData)) {
        updateSelectedValue();
      }
      invokeChangeEvents(newState, events);
    }
    return newSubscribeToAsyncState(
      mode,
      run,
      () => selfMemo.latestVersion,
      asyncState,
      configuration.subscriptionKey,
      events,
      onStateChange,
      updateSelectedValue,
    );
  }

  function watchAsyncState() {
    return watchOverAsyncState(
      asyncState,
      contextValue,
      mode,
      configuration,
      setGuard,
      subscriptionInfo.dispose
    );
  }
}

// useContext
// useRef
// useState
// useEffect
// this is a mini version of useAsyncState
// this hook uses fewer hooks and has fewer capabilities that useAsyncState
// its usage should be when you want to have control over a source
// and you do not intend to have it auto run, dependencies, manage payload
// etc etc.
// this is like useSyncExternalStore, but returns an object with several
// functions that allows controlling the external source. So, may be better ?
// this hook can use directly useSES on the asyncState instance
// but this will require additional memoization to add the other properties
// that UseAsyncState has (abort, mergePayload, invalidateCache, run, replaceState ...)
export function useSource<T>(
  source: AsyncStateSource<T>
): UseAsyncState<T, State<T>> {
  return useSourceLane(source);
}
export function useSourceLane<T>(
  source: AsyncStateSource<T>,
  lane?: string,
): UseAsyncState<T, State<T>> {
  const contextValue = React.useContext(AsyncStateContext);
  const asyncState = readAsyncStateFromSource(source).getLane(lane);
  const latestVersion = React.useRef<number | undefined>(asyncState.version);

  // declare a state snapshot initialized by the initial selected value
  // useState
  const [selectedValue, setSelectedValue] = React
    .useState<Readonly<UseAsyncState<T, State<T>>>>(calculateSelectedValue);

  if (selectedValue.version !== asyncState.version) {
    updateSelectedValue();
  }

  if (latestVersion.current !== selectedValue.version) {
    latestVersion.current = selectedValue.version;
  }

  // subscribe to async state
  React.useEffect(subscribeToAsyncState, [asyncState]);

  return selectedValue;

  function calculateSelectedValue(): Readonly<UseAsyncState<T, State<T>>> {
    let mode = AsyncStateSubscriptionMode.SOURCE;
    return makeUseAsyncStateReturnValue(
      asyncState,
      asyncState.currentState,
      source.key,
      runAsyncStateSubscriptionFn(mode, asyncState, contextValue),
      mode
    );
  }

  function updateSelectedValue() {
    setSelectedValue(calculateSelectedValue());
  }

  function subscribeToAsyncState() {
    let mode = AsyncStateSubscriptionMode.SOURCE;
    let runFn = runAsyncStateSubscriptionFn(mode, asyncState, contextValue);

    return newSubscribeToAsyncState(
      mode,
      runFn,
      () => latestVersion.current,
      asyncState,
      undefined,
      undefined,
      updateSelectedValue,
      updateSelectedValue,
    );
  }
}

const emptyArray = [];
// useContext
// useRef
// useState
// useEffect
// useLayoutEffect
// this is a mini version of useAsyncState
// this hook uses fewer hooks and has fewer capabilities that useAsyncState
// its usage should be when you want to have control over a producer (may be inline)
// and you do not intend to have it auto run, dependencies, manage payload
// etc etc.
// this is like useSyncExternalStore, but returns an object with several
// functions that allows controlling the external source. So, may be better ?
// this hook can use directly useSES on the asyncState instance
// but this will require additional memoization to add the other properties
// that UseAsyncState has (abort, mergePayload, invalidateCache, run, replaceState ...)
export function useProducer<T>(
  producer: Producer<T>,
): UseAsyncState<T, State<T>> {
  const contextValue = React.useContext(AsyncStateContext);
  const asyncState = React.useMemo<AsyncStateInterface<T>>(createInstance, emptyArray);
  const latestVersion = React.useRef<number | undefined>(asyncState.version);

  // declare a state snapshot initialized by the initial selected value
  // useState
  const [selectedValue, setSelectedValue] = React
    .useState<Readonly<UseAsyncState<T, State<T>>>>(initialize);

  if (latestVersion.current !== selectedValue.version) {
    latestVersion.current = selectedValue.version;
  }

  if (selectedValue.version !== asyncState.version) {
    updateSelectedValue();
  }

  // todo: change to insertEffect with a fallback to layout
  React.useLayoutEffect(onProducerChange, [producer]);
  // subscribe to async state
  React.useEffect(subscribeToAsyncState, []);

  return selectedValue;

  function createInstance() {
    return new AsyncState(nextKey(), producer);
  }

  function onProducerChange() {
    if (asyncState.originalProducer !== producer) {
      asyncState.replaceProducer(producer);
    }
  }


  function calculateSelectedValue(): Readonly<UseAsyncState<T, State<T>>> {
    let mode = AsyncStateSubscriptionMode.STANDALONE;
    return makeUseAsyncStateReturnValue(
      asyncState,
      asyncState.currentState,
      asyncState.key,
      runAsyncStateSubscriptionFn(mode, asyncState, contextValue),
      mode
    );
  }

  function updateSelectedValue() {
    setSelectedValue(calculateSelectedValue());
  }

  function subscribeToAsyncState() {
    let mode = AsyncStateSubscriptionMode.STANDALONE;
    let runFn = runAsyncStateSubscriptionFn(mode, asyncState, contextValue);

    return newSubscribeToAsyncState(
      mode,
      runFn,
      () => latestVersion.current,
      asyncState,
      undefined,
      undefined,
      updateSelectedValue,
      updateSelectedValue,
    );
  }

  function initialize(): Readonly<UseAsyncState<T, State<T>>> {
    let mode = AsyncStateSubscriptionMode.STANDALONE;
    return makeUseAsyncStateReturnValue(
      asyncState,
      readStateFromAsyncState(asyncState, oneObjectIdentity),
      asyncState.key,
      runAsyncStateSubscriptionFn(mode, asyncState, contextValue),
      mode
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
  // the configuration that the developer emitted, can be of many forms
  userConfig: UseAsyncStateConfig<T, E>,
  // overrides that the library may use to control something
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
  return Object.assign(
    {},
    defaultUseASConfig,
    overrides,
    userConfig
  );
}

function assignAutomaticKeyIfNotExists(newConfig, newMode) {
  if (newConfig.key !== undefined) {
    return;
  }
  if (
    newMode === AsyncStateSubscriptionMode.SOURCE ||
    newMode === AsyncStateSubscriptionMode.SOURCE_FORK
  ) {
    newConfig.key = newConfig.source!.key;
  } else {
    newConfig.key = nextKey();
  }
}

function parseUseAsyncStateConfiguration<T, E = State<T>>(
  // the configuration that the developer emitted, can be of many forms
  mixedConfig: UseAsyncStateConfig<T, E>,
  // the context value, nullable
  contextValue: AsyncStateContextValue | null,
  // the current version of the external calculation
  guard: number,
  // the ref holding previous configuration
  ownRef: UseAsyncStateRef<T, E>,
  // the hook dependencies
  dependencies: any[],
  // overrides that the library may use to control something
  overrides?: PartialUseAsyncStateConfiguration<T, E>,
): SubscriptionInfo<T, E> {

  const newConfig = readUserConfiguration(mixedConfig, overrides);
  const newMode = inferSubscriptionMode(contextValue, newConfig);

  const recalculateInstance = shouldRecalculateInstance(
    newConfig, newMode, guard, ownRef.subscriptionInfo);

  assignAutomaticKeyIfNotExists(newConfig, newMode);

  if (__DEV__) {
    warnInDevAboutIrrelevantUseAsyncStateConfiguration(newMode, newConfig);
  }

  let newAsyncState: AsyncStateInterface<T>;
  let previousInstance = ownRef.subscriptionInfo?.asyncState;

  if (recalculateInstance) {
    newAsyncState = inferAsyncStateInstance(newMode, newConfig, contextValue);
  } else {
    newAsyncState = previousInstance;
  }

  if (newConfig.lane) {
    newAsyncState = newAsyncState.getLane(newConfig.lane);
  }

  let didInstanceChange = previousInstance !== newAsyncState;
  let didModeChange = newMode !== ownRef.subscriptionInfo?.mode;

  let shouldCalculateNewOutput = didInstanceChange || didModeChange;

  let output: SubscriptionInfo<T, E>;

  if (shouldCalculateNewOutput) {
    let configKey: AsyncStateKey = newConfig.key as AsyncStateKey; // not falsy
    let runFn = runAsyncStateSubscriptionFn(newMode, newAsyncState, contextValue);
    let disposeFn = disposeAsyncStateSubscriptionFn(newMode, newAsyncState, contextValue);

    output = {
      run: runFn,
      mode: newMode,
      dispose: disposeFn,
      asyncState: newAsyncState,
      baseReturn: Object.freeze(makeUseAsyncStateBaseReturnValue(
        newAsyncState, configKey, runFn, newMode)),

      guard,
      deps: dependencies,
      configuration: newConfig,
    };
  } else {
    if (!ownRef.subscriptionInfo) {
      throw new Error("Cannot reuse ownRef.subscriptionInfo while it is not " +
        "defined. This is a bug, please fill an issue.");
    }
    output = shallowClone(ownRef.subscriptionInfo);

    output.guard = guard;
    output.deps = dependencies;
    output.configuration = newConfig;
  }

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

// this function returns a run function that's used to run the asyncState
// what different from AsyncState.run ?
// AsyncState.run expects a producerEffectsCreator to be able to add
// select, run and runp as members of ProducerProps.
// when inside provider, the producerEffectsCreator has much more capabilities
// it allows run, runp and select to have access to provider via string keys
// and cascade down this power
function runAsyncStateSubscriptionFn<T, E>(
  // the subscription mode
  mode: AsyncStateSubscriptionMode,
  // the instance
  asyncState: AsyncStateInterface<T>,
  // the context value, if applicable
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
          asyncState.run(standaloneProducerEffectsCreator, ...args);
      case AsyncStateSubscriptionMode.OUTSIDE_PROVIDER:
        return asyncState.run(standaloneProducerEffectsCreator, ...args);
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

// we only dispose what we hoist, other states are disposed
// automatically when their subscribers go to 0
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

// this functions search for the instance that you desire to subscribe to
function inferAsyncStateInstance<T, E>(
  // the subscription mode
  mode: AsyncStateSubscriptionMode,
  // the configuration
  configuration: UseAsyncStateConfiguration<T, E>,
  // the context, if applicable
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

function createEmptyObject<T, E>(): UseAsyncStateRef<T, E> {
  return Object.create(null);
}

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
  oldSubscriptionInfo: SubscriptionInfo<T, E> | undefined
): boolean {
  // here we check on relevant information to decide on the asyncState instance
  return !oldSubscriptionInfo ||
    newGuard !== oldSubscriptionInfo.guard ||
    newMode !== oldSubscriptionInfo.mode ||
    newConfig.producer !== oldSubscriptionInfo.configuration.producer ||
    newConfig.key !== undefined && newConfig.key !== oldSubscriptionInfo.configuration.key ||
    newConfig.source !== oldSubscriptionInfo.configuration.source ||
    newConfig.lane !== oldSubscriptionInfo.configuration.lane ||

    newConfig.fork !== oldSubscriptionInfo.configuration.fork ||
    newConfig.resetStateOnDispose !== oldSubscriptionInfo.configuration.resetStateOnDispose ||
    newConfig.forkConfig?.keepState !== oldSubscriptionInfo.configuration.forkConfig?.keepState ||

    newConfig.hoistToProvider !== oldSubscriptionInfo.configuration.hoistToProvider ||
    newConfig.hoistToProviderConfig?.override !== oldSubscriptionInfo.configuration.hoistToProviderConfig?.override;
}

function watchOverAsyncState<T, E = State<T>>(
  // the instance
  asyncState: AsyncStateInterface<T>,
  // this function only works inside provider, todo: remove the | null
  contextValue: AsyncStateContextValue | null,
  // the watching mode (waiting, listen, hoist..)
  mode: AsyncStateSubscriptionMode,
  // the configuration, will read key and hoistToProviderConfig in case of hoist
  configuration: UseAsyncStateConfiguration<T, E>,
  // a callback that notifies when the watch decided that a recalculation is necessary
  setGuard: (value: React.SetStateAction<number>) => void,
  // the dispose function that serves to destroy the old instance in case we need a new one for hoist mode
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
  // re-notify watchers that may have missed the notification for some reason
  // this case is not likely to occur,
  // but this is like a safety check that notify the watchers
  if (mode === AsyncStateSubscriptionMode.HOIST) {
    // when we are hoisting, since we notify again, better execute
    // the whole hoist again _without_ overriding it
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
      ? configuration.key : asyncState?.key;

    const unwatch = contextValue.watch(
      watchedKey as AsyncStateKey,
      function notify(mayBeNewAsyncState) {
        if (didClean) {
          return;
        }
        // only trigger a rerender if the newAsyncState is different
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

function newSubscribeToAsyncState<T>(
  mode: AsyncStateSubscriptionMode,
  run: (...args: any[]) => AbortFn,
  getLatestRenderedVersion: () => number | undefined,
  asyncState?: AsyncStateInterface<T>,
  subscriptionKey?: string,
  events?: UseAsyncStateEvents<T>,
  onUpdate?: (newState: State<T>) => void,
  onVersionMismatch?: () => void,
): CleanupFn {
  if (!asyncState || !onUpdate) {
    return;
  }
  let unsubscribe = asyncState.subscribe(onUpdate, subscriptionKey);
  let unsubscribeFromEvents = invokeSubscribeEvents(
    events?.subscribe, run, mode, asyncState);

  if (asyncState.version !== getLatestRenderedVersion() && isFn(onVersionMismatch)) {
    onVersionMismatch!();
  }

  return function cleanup() {
    if (unsubscribeFromEvents) {
      unsubscribeFromEvents.forEach(cb => invokeIfPresent(cb));
    }
    unsubscribe!();
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
  events: UseAsyncStateEventSubscribe<T> | undefined,
  run: (...args: any[]) => AbortFn,
  mode: AsyncStateSubscriptionMode,
  asyncState?: AsyncStateInterface<T>,
): CleanupFn[] | null {
  if (!events || !asyncState) {
    return null;
  }

  let eventProps: SubscribeEventProps<T> = {
    run,
    mode,
    getState: () => asyncState.currentState,
    invalidateCache: asyncState.invalidateCache.bind(asyncState),
  };

  let handlers: ((props: SubscribeEventProps<T>) => CleanupFn)[]
    = Array.isArray(events) ? events : [events];

  return handlers.map(handler => handler(eventProps));
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
function returnsUndefined() {
  return undefined;
}

function makeUseAsyncStateBaseReturnValue<T, E>(
  asyncState: AsyncStateInterface<T>,
  configurationKey: AsyncStateKey,
  run: (...args: any[]) => AbortFn,
  mode: AsyncStateSubscriptionMode
) {
  if (!asyncState) {
    return {
      mode,
      abort: noop,
      payload: null,
      replaceState: noop,
      mergePayload: noop,
      uniqueId: undefined,
      key: configurationKey,
      invalidateCache: noop,
      run: returnsUndefined,
      replay: returnsUndefined,
    };
  }

  return {
    mode,
    key: asyncState.key,
    version: asyncState.version,
    source: asyncState._source,
    payload: asyncState.payload,
    uniqueId: asyncState.uniqueId,

    mergePayload(newPayload) {
      asyncState.payload = shallowClone(
        asyncState.payload,
        newPayload
      );
    },

    abort: asyncState.abort.bind(asyncState),
    replay: asyncState.replay.bind(asyncState),
    replaceState: asyncState.replaceState.bind(asyncState),
    run: isFn(run) ? run : asyncState.run.bind(asyncState, standaloneProducerEffectsCreator),
    invalidateCache: asyncState.invalidateCache.bind(asyncState),
  };
}

function makeUseAsyncStateReturnValue<T, E>(
  asyncState: AsyncStateInterface<T>,
  stateValue: E,
  configurationKey: AsyncStateKey,
  run: (...args: any[]) => AbortFn,
  mode: AsyncStateSubscriptionMode
): Readonly<UseAsyncState<T, E>> {

  // @ts-ignore
  // ok ts! I will append missing properties right now!
  const base: UseAsyncState<T, E> = makeUseAsyncStateBaseReturnValue(
    asyncState, configurationKey, run, mode);

  base.state = stateValue;
  if (!asyncState) {
    base.read = function() {
      return stateValue;
    };
    return Object.freeze(base);
  }
  base.payload = asyncState.payload;
  base.lastSuccess = asyncState.lastSuccess;
  base.read = createReadInConcurrentMode(asyncState, stateValue);
  return Object.freeze(base);
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
