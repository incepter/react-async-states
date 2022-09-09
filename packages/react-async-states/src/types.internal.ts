import * as React from "react";
import {ReactNode} from "react";
import {
  AbortFn,
  AsyncStateInterface,
  AsyncStateKey,
  AsyncStateSource,
  AsyncStateStatus,
  CacheConfig,
  CachedState,
  ForkConfig,
  Producer,
  ProducerConfig,
  ProducerEffects,
  ProducerProps,
  ProducerRunEffects,
  RenderStrategy,
  State,
  StateUpdater
} from "./async-state";

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

interface BaseUseAsyncState<T, E = State<T>> {
  key: AsyncStateKey,

  source?: AsyncStateSource<T>,
  mode: AsyncStateSubscriptionMode,

  payload: { [id: string]: any } | null,

  replay: () => AbortFn,
  abort: ((reason?: any) => void),
  run: (...args: any[]) => AbortFn,
  replaceState: StateUpdater<T>,
  mergePayload: (argv: { [id: string]: any }) => void,

  uniqueId: number | undefined,
  invalidateCache: (cacheKey?: string) => void,

}

export interface UseAsyncState<T, E = State<T>> extends BaseUseAsyncState<T, E> {
  state: E,
  read: () => E,
  version?: number,
  lastSuccess?: State<T>,
}

export type EqualityFn<T> = (
  prev: T,
  next: T
) => boolean;


export interface BaseConfig<T> extends ProducerConfig<T>{
  key?: AsyncStateKey,
  subscriptionKey?: AsyncStateKey,

  lazy?: boolean,
  condition?: boolean,
  payload?: { [id: string]: any },

  fork?: boolean,
  forkConfig?: ForkConfig,

  hoistToProvider?: boolean,
  hoistToProviderConfig?: HoistToProviderConfig,

  events?: UseAsyncStateEvents<T>,
  lane?: string,
}

export interface ConfigWithKeyWithSelector<T, E> extends ConfigWithKeyWithoutSelector<T> {
  selector: useSelector<T, E>,
  areEqual?: EqualityFn<E>,
}
export interface ConfigWithKeyWithoutSelector<T> extends BaseConfig<T> {
  key: AsyncStateKey,
}

export interface ConfigWithSourceWithSelector<T, E> extends ConfigWithSourceWithoutSelector<T> {
  selector: useSelector<T, E>,
  areEqual?: EqualityFn<E>,
}

export interface ConfigWithSourceWithoutSelector<T> extends BaseConfig<T> {
  source: AsyncStateSource<T>,
}

export interface ConfigWithProducerWithSelector<T, E> extends ConfigWithProducerWithoutSelector<T> {
  selector: useSelector<T, E>,
  areEqual?: EqualityFn<E>,
}

export interface ConfigWithProducerWithoutSelector<T> extends BaseConfig<T> {
  producer?: Producer<T>,
}

export type MixedConfig<T, E> = AsyncStateKey | AsyncStateSource<T> | Producer<T> |
  ConfigWithKeyWithSelector<T, E> |
  ConfigWithKeyWithoutSelector<T> |
  ConfigWithSourceWithSelector<T, E> |
  ConfigWithSourceWithoutSelector<T> |
  ConfigWithProducerWithSelector<T, E> |
  ConfigWithProducerWithoutSelector<T>;




export type UseAsyncStateConfiguration<T, E = State<T>> = {
  subscriptionKey?: AsyncStateKey,

  key?: AsyncStateKey,
  source?: AsyncStateSource<T>,

  producer?: Producer<T>,
  initialValue?: T | ((cache: Record<string, CachedState<T>>) => T),

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
  config: MixedConfig<T, E>,

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

export type SubscriptionInfo<T, E> = {
  mode: AsyncStateSubscriptionMode,
  asyncState: AsyncStateInterface<T>,
  configuration: UseAsyncStateConfiguration<T, E>,

  guard: Object,
  deps: readonly any[],

  dispose: () => boolean | undefined,
  run: (...args: any[]) => AbortFn,

  baseReturn: BaseUseAsyncState<T, E>,
}

export type UseAsyncStateContextType = AsyncStateContextValue | null;

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

export type UseAsyncStateRef<T, E = State<T>> = {
  latestData: E,
  latestVersion?: number,
  subscriptionInfo: SubscriptionInfo<T, E>,
}

export interface UseAsyncStateType<T, E> {
  (
    subscriptionConfig: MixedConfig<T, E>,
    dependencies?: any[]
  ): UseAsyncState<T, E>,

  auto(
    subscriptionConfig: MixedConfig<T, E>,
    dependencies?: any[]
  ): UseAsyncState<T, E>,

  lazy(
    subscriptionConfig: MixedConfig<T, E>,
    dependencies?: any[]
  ): UseAsyncState<T, E>,

  fork(
    subscriptionConfig: MixedConfig<T, E>,
    dependencies?: any[]
  ): UseAsyncState<T, E>,

  hoist(
    subscriptionConfig: MixedConfig<T, E>,
    dependencies?: any[]
  ): UseAsyncState<T, E>,

  forkAuto(
    subscriptionConfig: MixedConfig<T, E>,
    dependencies?: any[]
  ): UseAsyncState<T, E>,

  hoistAuto(
    subscriptionConfig: MixedConfig<T, E>,
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
