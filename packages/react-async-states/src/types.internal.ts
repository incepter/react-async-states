import * as React from "react";
import {ReactNode} from "react";
import {
  AbortFn,
  AsyncStateKeyOrSource,
  AsyncStateStatus, BaseSource,
  CacheConfig,
  CachedState,
  ForkConfig,
  HoistToProviderConfig,
  Producer,
  ProducerConfig,
  ProducerEffects,
  ProducerProps,
  ProducerRunEffects,
  RenderStrategy,
  Source,
  State,
  StateInterface,
  StateUpdater
} from "./async-state";
import {
  AsyncStateManagerInterface,
  AsyncStateWatchKey,
  ManagerWatchCallback,
  ManagerWatchCallbackValue
} from "./async-state";

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

export type StateContextValue = {
  manager: AsyncStateManagerInterface,

  getAllKeys(): string[],
  get<T>(key: string): StateInterface<T>,
  dispose<T>(asyncState: StateInterface<T>): boolean,
  hoist<T>(key: string, instance: StateInterface<T>, hoistConfig?: HoistToProviderConfig): StateInterface<T>,

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

  getPayload(): Record<string, any>,
  mergePayload(partialPayload: Record<string, any>): void,
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
  setState: StateUpdater<T>,
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

// interface NewUseAsyncState<T, E = State<T>> extends Source<T> {
//
//   key: string,
//   version?: number,
//   mode: SubscriptionMode,
//   uniqueId: number | undefined,
//   source?: Source<T> | undefined,
//
//   state: E | undefined,
//   read(): E | undefined,
//   lastSuccess?: State<T>,
//
// }

export type EqualityFn<T> = (
  prev: T,
  next: T
) => boolean;


export interface BaseConfig<T> extends ProducerConfig<T>{
  key?: string,
  lane?: string,
  autoRunArgs?: any[],
  subscriptionKey?: string,
  payload?: Record<string, any>,
  events?: UseAsyncStateEvents<T>,

  lazy?: boolean,
  condition?: boolean,

  fork?: boolean,
  forkConfig?: ForkConfig,
  hoistToProvider?: boolean,
  hoistToProviderConfig?: HoistToProviderConfig,
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
  key?: string,
  lane?: string,
  source?: Source<T>,
  producer?: Producer<T>,
  skipPendingDelayMs?: number,
  cacheConfig?: CacheConfig<T>,
  runEffectDurationMs?: number,
  resetStateOnDispose?: boolean,
  payload?: Record<string, any>,
  runEffect?: ProducerRunEffects,
  initialValue?: T | ((cache: Record<string, CachedState<T>>) => T),

  fork?: boolean,
  forkConfig?: ForkConfig,
  hoistToProvider?: boolean,
  hoistToProviderConfig?: HoistToProviderConfig,

  lazy?: boolean,
  autoRunArgs?: any[],
  condition?: boolean,
  areEqual: EqualityFn<E>,
  subscriptionKey?: string,
  selector: useSelector<T, E>,
  events?: UseAsyncStateEvents<T>,
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

export type UseAsyncStateChangeEventHandler<T> =
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

