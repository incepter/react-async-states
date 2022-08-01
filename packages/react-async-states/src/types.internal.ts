import * as React from "react";
import {
  AbortFn,
  AsyncStateInterface,
  AsyncStateKey,
  AsyncStateSource, AsyncStateStatus,
  CacheConfig,
  CachedState,
  ForkConfig,
  Producer,
  ProducerConfig,
  ProducerProps,
  ProducerRunEffects, RenderStrategy,
  ProducerEffects,
  State,
  StateUpdater
} from "./async-state";
import {ReactNode} from "react";

export type Reducer<T> = (
  T,
  ...args: any[]
) => T;

export type ExtendedInitialAsyncState<T> =
  InitialAsyncState<T>
  | AsyncStateSource<T>;

export type InitialAsyncState<T> = {
  key: AsyncStateKey,
  producer?: Producer<T>,
  config?: ProducerConfig<T>
}

export interface AsyncStateInitializer<T> {
  producer?: Producer<T>,
  key?: AsyncStateKey,
  config?: ProducerConfig<T>
}

export enum AsyncStateSubscriptionMode {
  LISTEN = "LISTEN", // simple listener
  HOIST = "HOIST", // hoisting a producer, for first time and intended to be shared, more like of an injection
  STANDALONE = "STANDALONE", // working standalone even if inside provider
  WAITING = "WAITING", // waits for the original to be hoisted
  FORK = "FORK", // forking an existing one in the provider
  NOOP = "NOOP", // a weird case that should not happen
  SOURCE = "SOURCE", // subscription via source property
  SOURCE_FORK = "SOURCE_FORK", // subscription via source property and fork
  OUTSIDE_PROVIDER = "OUTSIDE_PROVIDER", // standalone outside provider
}

export type AsyncStateWatchKey = string | symbol;

// manager types

export type AsyncStateEntry<T> = {
  initiallyHoisted: boolean,
  value: AsyncStateInterface<T>,
}

export type AsyncStateEntries = {
  [id: AsyncStateKey]: AsyncStateEntry<any>,
}

export type AsyncStateKeyOrSource<T> = string | AsyncStateSource<T>;

export type AsyncStateSelectorKeys = string[];

export type AsyncStateSelector<T> =
  SimpleSelector<any, T>
  | ArraySelector<T>
  | FunctionSelector<T>;


export type HoistToProviderConfig = {
  override: boolean,
}

export type ManagerHoistConfig<T> = {
  initialValue?: T,
  runEffect?: ProducerRunEffects,
  runEffectDurationMs?: number,
  resetStateOnDispose?: boolean,
  skipPendingDelayMs?: number,
  producer?: Producer<T>,

  key: AsyncStateKey,
  hoistToProviderConfig?: HoistToProviderConfig,
  cacheConfig?: CacheConfig<T>,
}

export type ManagerWatchCallbackValue<T> = AsyncStateInterface<T> | null;
export type ManagerWatchCallback<T> = (
  value: ManagerWatchCallbackValue<T>,
  additionalInfo: AsyncStateKey
) => void;

export type WatcherType = {
  cleanup: AbortFn,
  notify: ManagerWatchCallback<any>,
}

export type ManagerWatchers = {
  meter: number,
  watchers: {
    [id: string | symbol]: WatcherType
  }
}


export type AsyncStateManagerInterface = {
  entries: AsyncStateEntries,
  watchers: ManagerWatchers,
  run<T>(
    asyncState: AsyncStateInterface<T>,
    ...args: any[]
  ): AbortFn,
  get<T>(key: AsyncStateKey): AsyncStateInterface<T>,
  fork<T>(
    key: AsyncStateKey,
    config: ForkConfig
  ): AsyncStateInterface<T> | undefined,
  select<T>(
    keys: AsyncStateSelectorKeys,
    selector: AsyncStateSelector<T>,
    reduceToObject?: boolean
  ): T,
  hoist<T>(config: ManagerHoistConfig<T>): AsyncStateInterface<T>,
  dispose<T>(asyncState: AsyncStateInterface<T>): boolean,
  watch<T>(
    key: AsyncStateWatchKey,
    value: ManagerWatchCallback<T>
  ): AbortFn,
  notifyWatchers<T>(
    key: AsyncStateKey,
    value: ManagerWatchCallbackValue<T>
  ): void,
  runAsyncState<T>(
    keyOrSource: AsyncStateKeyOrSource<T>,
    ...args: any[]
  ): AbortFn,
  runAsyncStateLane<T>(
    keyOrSource: AsyncStateKeyOrSource<T>,
    lane: string | undefined,
    ...args: any[]
  ): AbortFn,
  getAllKeys(): AsyncStateKey[],
  watchAll(cb: ManagerWatchCallback<any>),
  setInitialStates(initialStates?: InitialStates): AsyncStateEntry<any>[],

  producerEffectsCreator<T>(props: ProducerProps<T>): ProducerEffects,
}

// end manager types

export type AsyncStateContextValue = {
  manager: AsyncStateManagerInterface,
  payload: { [id: string]: any },
  run<T>(
    asyncState: AsyncStateInterface<T>,
    ...args: any[]
  ): AbortFn,
  get<T>(key: AsyncStateKey): AsyncStateInterface<T>,
  fork<T>(
    key: AsyncStateKey,
    config?: ForkConfig
  ): AsyncStateInterface<T> | undefined,
  select<T>(
    keys: AsyncStateSelectorKeys,
    selector: AsyncStateSelector<T>,
    reduceToObject?: boolean
  ): T,
  hoist<T>(config: ManagerHoistConfig<T>): AsyncStateInterface<T>,
  dispose<T>(asyncState: AsyncStateInterface<T>): boolean,
  watch<T>(
    key: AsyncStateWatchKey,
    value: ManagerWatchCallback<T>
  ): AbortFn,
  notifyWatchers<T>(
    key: AsyncStateKey,
    value: ManagerWatchCallbackValue<T>
  ): void,
  runAsyncState<T>(
    keyOrSource: AsyncStateKeyOrSource<T>,
    lane: string | undefined,
    ...args: any[]
  ): AbortFn,
  getAllKeys(): AsyncStateKey[],
  watchAll(cb: ManagerWatchCallback<any>),

  producerEffectsCreator<T>(props: ProducerProps<T>): ProducerEffects,
}


// use async state

export type UseAsyncState<T, E = State<T>> = {
  state: E,
  key: AsyncStateKey,

  source?: AsyncStateSource<T>,
  mode: AsyncStateSubscriptionMode,
  lastSuccess?: State<T>,

  payload: { [id: string]: any } | null,

  replay: () => AbortFn,
  abort: ((reason?: any) => void),
  run: (...args: any[]) => AbortFn,
  replaceState: StateUpdater<T>,
  mergePayload: (argv: { [id: string]: any }) => void,

  uniqueId: number | undefined,
  invalidateCache: (cacheKey?: string) => void,

  read: () => E,
}

export type EqualityFn<T> = (
  prev: T,
  next: T
) => boolean;

export type UseAsyncStateConfiguration<T, E = State<T>> = {
  subscriptionKey?: AsyncStateKey,

  key?: AsyncStateKey,
  source?: AsyncStateSource<T>,

  producer?: Producer<T>,
  initialValue?: T,

  lazy?: boolean,
  condition?: boolean,
  payload?: { [id: string]: any },

  runEffect?: ProducerRunEffects,
  skipPendingDelayMs?: number,
  runEffectDurationMs?: number,
  resetStateOnDispose?: boolean,
  cacheConfig?: CacheConfig<T>,

  fork?: boolean,
  forkConfig?: ForkConfig,

  hoistToProvider?: boolean,
  hoistToProviderConfig?: HoistToProviderConfig,

  selector: useSelector<T, E>,
  areEqual: EqualityFn<E>,

  events?: UseAsyncStateEvents<T>,
  lane?: string,
}

export type StateBoundaryProps<T, E> = {
  children: React.ReactNode,
  config: UseAsyncStateConfig<T, E>,

  dependencies?: any[],
  strategy?: RenderStrategy,

  render?: StateBoundaryRenderProp,
}

export type StateBoundaryRenderProp = Record<AsyncStateStatus, ReactNode>

export type UseAsyncStateEventProps<T> = {
  state: State<T>,
};

type UseAsyncStateChangeEventHandler<T> =
  ((props: UseAsyncStateEventProps<T>) => void)

export type UseAsyncStateEventFn<T> =
  UseAsyncStateChangeEvent<T>
  |
  UseAsyncStateChangeEventHandler<T>;

export type UseAsyncStateChangeEvent<T> = {
  status: AsyncStateStatus
  handler: UseAsyncStateChangeEventHandler<T>,
}

export type UseAsyncStateEventSubscribe<T> =
  ((props: SubscribeEventProps<T>) => CleanupFn)
  | ((props: SubscribeEventProps<T>) => CleanupFn)[]

export type UseAsyncStateEvents<T> = {
  change?: UseAsyncStateEventFn<T> | UseAsyncStateEventFn<T>[],
  subscribe?: UseAsyncStateEventSubscribe<T>,
}

export type SubscribeEventProps<T> = {
  getState: () => State<T>,
  run: (...args: any[]) => AbortFn,
  mode: AsyncStateSubscriptionMode,
  invalidateCache: (cacheKey?: string) => void,
}

export type useSelector<T, E> =
  (
    currentState: State<T>, lastSuccess: State<T>,
    cache: { [id: string]: CachedState<T> }
  ) => E;

export type PartialUseAsyncStateConfiguration<T, E> = Partial<UseAsyncStateConfiguration<T, E>>

export type UseAsyncStateSubscriptionInfo<T, E> = {
  mode: AsyncStateSubscriptionMode,
  asyncState: AsyncStateInterface<T>,
  configuration: UseAsyncStateConfiguration<T, E>,

  guard: Object,
  deps: readonly any[],

  dispose: () => boolean | undefined,
  run: (...args: any[]) => AbortFn,
}

export type UseAsyncStateRefsFactory<T, E> = {
  returnValue?: UseAsyncState<T, E>,
  subscriptionInfo?: UseAsyncStateSubscriptionInfo<T, E>
};

export type UseAsyncStateContextType = AsyncStateContextValue | null;

export type UseAsyncStateConfig<T, E = State<T>> =
  string
  | Producer<T>
  | AsyncStateSource<T>
  | UseAsyncStateConfiguration<T, E>
  | Partial<UseAsyncStateConfiguration<T, E>>;

export type UseSimpleAsyncStateConfig<T> = UseAsyncStateConfig<T, State<T>>;

export type InitialStatesObject = { [id: string]: ExtendedInitialAsyncState<any> };

export type InitialStates = ExtendedInitialAsyncState<any>[]
  | InitialStatesObject;

export type StateProviderProps = {
  children: any,
  initialStates?: InitialStates,
  payload?: { [id: string]: any },
}

export type CleanupFn = AbortFn
  | (() => void)
  | undefined;

export type MemoizedUseAsyncStateRef<T, E = State<T>> = {
  latestData: E,
  subscriptionInfo: UseAsyncStateSubscriptionInfo<T, E>,
}

export type SelectorManager = {
  didUnmount: boolean,
  has: (key: string) => boolean,
  subscriptions: SelectorSubscriptionsMap,
}

export type SelectorSubscriptionsMap = {
  [id: string]: SelectorSubscription<any>,
}

export type SelectorSubscription<T> = {
  cleanup: CleanupFn,
  asyncState: AsyncStateInterface<T>,
}

export interface UseAsyncStateType<T, E> {
  (
    subscriptionConfig: UseAsyncStateConfig<T, E>,
    dependencies?: any[]
  ): UseAsyncState<T, E>,

  auto(
    subscriptionConfig: UseAsyncStateConfig<T, E>,
    dependencies?: any[]
  ): UseAsyncState<T, E>,

  lazy(
    subscriptionConfig: UseAsyncStateConfig<T, E>,
    dependencies?: any[]
  ): UseAsyncState<T, E>,

  fork(
    subscriptionConfig: UseAsyncStateConfig<T, E>,
    dependencies?: any[]
  ): UseAsyncState<T, E>,

  hoist(
    subscriptionConfig: UseAsyncStateConfig<T, E>,
    dependencies?: any[]
  ): UseAsyncState<T, E>,

  forkAuto(
    subscriptionConfig: UseAsyncStateConfig<T, E>,
    dependencies?: any[]
  ): UseAsyncState<T, E>,

  hoistAuto(
    subscriptionConfig: UseAsyncStateConfig<T, E>,
    dependencies?: any[]
  ): UseAsyncState<T, E>,
}

export type BaseSelectorKey = AsyncStateKey | AsyncStateSource<any>

export type UseSelectorFunctionKeys = ((allKeys: AsyncStateKey[]) => BaseSelectorKey[]);

export type SelectorKeysArg =
  BaseSelectorKey
  | BaseSelectorKey[]
  | UseSelectorFunctionKeys

export interface FunctionSelectorItem<T> extends Partial<State<T>> {
  key: AsyncStateKey,
  lastSuccess?: State<T>,
  cache?: Record<string, CachedState<T>>,
}

export type FunctionSelectorArgument = Record<AsyncStateKey, FunctionSelectorItem<any> | undefined>;

export type FunctionSelector<T> = (arg: FunctionSelectorArgument) => T;

export type SimpleSelector<T, E> = (props: FunctionSelectorItem<T> | undefined) => E;
export type ArraySelector<T> = (...states: (FunctionSelectorItem<any> | undefined)[]) => T;
