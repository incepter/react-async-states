import * as React from "react";
import {ReactNode} from "react";
import {
  AbortFn,
  AsyncStateManagerInterface,
  Status,
  CacheConfig,
  CachedState,
  ForkConfig,
  hoistConfig,
  Producer,
  ProducerConfig,
  RunEffect,
  Source,
  State,
  StateInterface,
  StateUpdater, StateFunctionUpdater
} from "./async-state";
import {RUNCProps} from "./async-state/AsyncState";

export interface AsyncStateInitializer<T> {
  key?: string,
  producer?: Producer<T>,
  config?: ProducerConfig<T>
}

export type StateContextValue = AsyncStateManagerInterface;

// use async state

export interface BaseUseAsyncState<T, E = State<T>> extends Source<T>{
  flags?: number,
  source?: Source<T>,
  devFlags?: string[],
}

type IterableUseAsyncState<T, E = State<T>> = [
  E,
  (updater: StateFunctionUpdater<T> | T, status?: Status,)=>void,
  UseAsyncState<T, E>
]

export interface UseAsyncState<T, E = State<T>> extends BaseUseAsyncState<T, E>, Iterable<any> {
  state: E,
  read(): E,
  version?: number,
  lastSuccess?: State<T>,

  toArray(): IterableUseAsyncState<T, E>
}

// interface NewUseAsyncState<T, E = State<T>> extends Source<T> {
//
//   key: string,
//   version?: number,
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
  source?: Source<T>,
  autoRunArgs?: any[],
  producer?: Producer<T>,
  subscriptionKey?: string,
  payload?: Record<string, any>,
  events?: UseAsyncStateEvents<T>,

  lazy?: boolean,
  condition?: boolean,

  fork?: boolean,
  forkConfig?: ForkConfig,
  hoist?: boolean,
  hoistConfig?: hoistConfig,
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
  skipPendingStatus?: boolean,
  cacheConfig?: CacheConfig<T>,
  runEffectDurationMs?: number,
  resetStateOnDispose?: boolean,
  payload?: Record<string, any>,
  runEffect?: RunEffect,
  initialValue?: T | ((cache: Record<string, CachedState<T>>) => T),

  fork?: boolean,
  forkConfig?: ForkConfig,

  hoist?: boolean,
  hoistConfig?: hoistConfig,

  lazy?: boolean,
  autoRunArgs?: any[],
  condition?: boolean,
  areEqual: EqualityFn<E>,
  subscriptionKey?: string,
  selector: useSelector<T, E>,
  events?: UseAsyncStateEvents<T>,

  // dev only
  hideFromDevtools?: boolean,
}

export enum RenderStrategy {
  FetchAsYouRender = 0,
  FetchThenRender = 1,
  RenderThenFetch = 2,
}

export type StateBoundaryProps<T, E> = {
  children: React.ReactNode,
  config: MixedConfig<T, E>,

  dependencies?: any[],
  strategy?: RenderStrategy,

  render?: StateBoundaryRenderProp,
}

export type StateBoundaryRenderProp = Record<Status, ReactNode>

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
  status: Status
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
  invalidateCache: (cacheKey?: string) => void,
}

export type useSelector<T, E> =
  (
    currentState: State<T>, lastSuccess: State<T>,
    cache: { [id: string]: CachedState<T> } | null
  ) => E;

export type PartialUseAsyncStateConfiguration<T, E> = Partial<UseAsyncStateConfiguration<T, E>>

export type UseAsyncStateContextType = StateContextValue | null;


export type CleanupFn = AbortFn
  | (() => void)
  | undefined;

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

