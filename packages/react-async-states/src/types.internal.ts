import * as React from "react";
import {ReactNode} from "react";
import {
  AbortFn,
  StateInterface,
  Source,
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
  | Source<T>;

export type InitialAsyncState<T> = {
  key: string,
  producer?: Producer<T>,
  config?: ProducerConfig<T>
}

export interface AsyncStateInitializer<T> {
  key?: string,
  producer?: Producer<T>,
  config?: ProducerConfig<T>
}

export enum SubscriptionMode {
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
  value: StateInterface<T>,
}

export type AsyncStateEntries = Record<string, AsyncStateEntry<any>>

export type AsyncStateKeyOrSource<T> = string | Source<T>;

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

  key: string,
  hoistToProviderConfig?: HoistToProviderConfig,
  cacheConfig?: CacheConfig<T>,
}

export type ManagerWatchCallbackValue<T> = StateInterface<T> | null;
export type ManagerWatchCallback<T> = (
  value: ManagerWatchCallbackValue<T>,
  additionalInfo: string
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
    asyncState: StateInterface<T>,
    ...args: any[]
  ): AbortFn,
  get<T>(key: string): StateInterface<T>,
  fork<T>(
    key: string,
    config: ForkConfig
  ): StateInterface<T> | undefined,
  hoist<T>(config: ManagerHoistConfig<T>): StateInterface<T>,
  dispose<T>(asyncState: StateInterface<T>): boolean,
  watch<T>(
    key: AsyncStateWatchKey,
    value: ManagerWatchCallback<T>
  ): AbortFn,
  notifyWatchers<T>(
    key: string,
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
  getAllKeys(): string[],
  watchAll(cb: ManagerWatchCallback<any>),
  setInitialStates(initialStates?: InitialStates): AsyncStateEntry<any>[],

  producerEffectsCreator<T>(props: ProducerProps<T>): ProducerEffects,
}

// end manager types

export type StateContextValue = {
  manager: AsyncStateManagerInterface,
  payload: Record<string, any> | null,

  getAllKeys(): string[],
  get<T>(key: string): StateInterface<T>,
  dispose<T>(asyncState: StateInterface<T>): boolean,
  hoist<T>(config: ManagerHoistConfig<T>): StateInterface<T>,
  fork<T>(key: string, config?: ForkConfig): StateInterface<T> | undefined,

  watchAll(cb: ManagerWatchCallback<any>),
  notifyWatchers<T>(key: string, value: ManagerWatchCallbackValue<T>): void,
  watch<T>(key: AsyncStateWatchKey, value: ManagerWatchCallback<T>): AbortFn,

  run<T>(instance: StateInterface<T>, ...args: any[]): AbortFn,
  runAsyncState<T>(
    keyOrSource: AsyncStateKeyOrSource<T>,
    lane: string | undefined,
    ...args: any[]
  ): AbortFn,

  producerEffectsCreator<T>(props: ProducerProps<T>): ProducerEffects,
}


// use async state

interface BaseUseAsyncState<T, E = State<T>> {
  key: string,

  source?: Source<T>,
  mode: SubscriptionMode,

  payload: Record<string, any> | null,

  replay(): AbortFn,
  abort(reason?: any): void,
  run(...args: any[]): AbortFn,
  replaceState: StateUpdater<T>,
  mergePayload(argv: Record<string, any>): void,

  uniqueId: number | undefined,
  invalidateCache(cacheKey?: string): void,
}

export interface UseAsyncState<T, E = State<T>> extends BaseUseAsyncState<T, E> {
  state: E,
  read(): E,
  version?: number,
  lastSuccess?: State<T>,
}

export type EqualityFn<T> = (
  prev: T,
  next: T
) => boolean;


export interface BaseConfig<T> extends ProducerConfig<T>{
  key?: string,
  subscriptionKey?: string,

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
  key: string,
}

export interface ConfigWithSourceWithSelector<T, E> extends ConfigWithSourceWithoutSelector<T> {
  selector: useSelector<T, E>,
  areEqual?: EqualityFn<E>,
}

export interface ConfigWithSourceWithoutSelector<T> extends BaseConfig<T> {
  source: Source<T>,
}

export interface ConfigWithProducerWithSelector<T, E> extends ConfigWithProducerWithoutSelector<T> {
  selector: useSelector<T, E>,
  areEqual?: EqualityFn<E>,
}

export interface ConfigWithProducerWithoutSelector<T> extends BaseConfig<T> {
  producer?: Producer<T>,
}

export type MixedConfig<T, E> = string | Source<T> | Producer<T> |
  ConfigWithKeyWithSelector<T, E> |
  ConfigWithKeyWithoutSelector<T> |
  ConfigWithSourceWithSelector<T, E> |
  ConfigWithSourceWithoutSelector<T> |
  ConfigWithProducerWithSelector<T, E> |
  ConfigWithProducerWithoutSelector<T>;




export type UseAsyncStateConfiguration<T, E = State<T>> = {
  subscriptionKey?: string,

  key?: string,
  source?: Source<T>,

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
  mode: SubscriptionMode,
  invalidateCache: (cacheKey?: string) => void,
}

export type useSelector<T, E> =
  (
    currentState: State<T>, lastSuccess: State<T>,
    cache: { [id: string]: CachedState<T> } | null
  ) => E;

export type PartialUseAsyncStateConfiguration<T, E> = Partial<UseAsyncStateConfiguration<T, E>>

export type SubscriptionInfo<T, E> = {
  mode: SubscriptionMode,
  asyncState: StateInterface<T>,
  configuration: UseAsyncStateConfiguration<T, E>,

  guard: Object,
  deps: readonly any[],

  dispose: () => boolean | undefined,
  run: (...args: any[]) => AbortFn,

  baseReturn: BaseUseAsyncState<T, E>,
}

export type UseAsyncStateContextType = StateContextValue | null;

export type InitialStatesObject = { [id: string]: ExtendedInitialAsyncState<any> };

export type InitialStates = ExtendedInitialAsyncState<any>[]
  | InitialStatesObject;

export type StateProviderProps = {
  manager?: AsyncStateManagerInterface,
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

export type BaseSelectorKey = string | Source<any>

export type UseSelectorFunctionKeys = ((allKeys: string[]) => BaseSelectorKey[]);

export type SelectorKeysArg =
  BaseSelectorKey
  | BaseSelectorKey[]
  | UseSelectorFunctionKeys

export interface FunctionSelectorItem<T> extends Partial<State<T>> {
  key: string,
  lastSuccess?: State<T>,
  cache?: Record<string, CachedState<T>> | null,
}

export type FunctionSelectorArgument = Record<string, FunctionSelectorItem<any> | undefined>;

export type FunctionSelector<T> = (arg: FunctionSelectorArgument) => T;

export type SimpleSelector<T, E> = (props: FunctionSelectorItem<T> | undefined) => E;
export type ArraySelector<T> = (...states: (FunctionSelectorItem<any> | undefined)[]) => T;
