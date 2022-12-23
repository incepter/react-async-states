import * as React from "react";
import {ReactNode} from "react";
import {
  AbortFn,
  CacheConfig,
  CachedState,
  ErrorState,
  ForkConfig,
  hoistConfig,
  InitialState,
  ManagerInterface,
  PendingState,
  Producer,
  ProducerConfig,
  RunEffect,
  Source,
  State,
  StateFunctionUpdater,
  Status,
  SuccessState
} from "@core";
import {RenderStrategy} from "./StateBoundary";

export interface AsyncStateInitializer<T, E = any, R = any> {
  key?: string,
  producer?: Producer<T, E, R>,
  config?: ProducerConfig<T, E, R>
}

export type StateContextValue = ManagerInterface;

// use async state

export interface BaseUseAsyncState<T, E, R, S = State<T, E, R>> extends Source<T, E, R> {
  flags?: number,
  source?: Source<T, E, R>,
  devFlags?: string[],
}

type IterableUseAsyncState<T, E, R, S = State<T, E, R>> = [
  S,
  (updater: StateFunctionUpdater<T, E, R> | T, status?: Status) => void,
  UseAsyncState<T, E, R, S>
]

export interface UseAsyncState<T, E = any, R = any, S = State<T, E, R>> extends BaseUseAsyncState<T, E, R, S>, Iterable<any> {
  state: S,

  read(suspend?: boolean, throwError?: boolean): S,

  version?: number,
  lastSuccess?: SuccessState<T> | InitialState<T>,

  toArray(): IterableUseAsyncState<T, E, R, S>
}

// interface NewUseAsyncState<T, S, R, S = State<T, S, R>> extends Source<T, S, R> {
//
//   key: string,
//   version?: number,
//   uniqueId: number | undefined,
//   source?: Source<T, S, R> | undefined,
//
//   state: S | undefined,
//   read(): S | undefined,
//   lastSuccess?: State<T, S, R>,
//
// }

export type EqualityFn<T> = (
  prev: T,
  next: T
) => boolean;


export interface BaseConfig<T, E, R> extends ProducerConfig<T, E, R> {
  key?: string,
  lane?: string,
  source?: Source<T, E, R>,
  autoRunArgs?: any[],
  producer?: Producer<T, E, R>,
  subscriptionKey?: string,
  payload?: Record<string, any>,
  events?: UseAsyncStateEvents<T, E, R>,

  lazy?: boolean,
  condition?: boolean | ((state: State<T, E, R>) => boolean),

  fork?: boolean,
  forkConfig?: ForkConfig,
  hoist?: boolean,
  hoistConfig?: hoistConfig,

  throw?: boolean | ((
    errorState: ErrorState<T, E>, source: Source<T, E, R>) => boolean),
  suspend?: boolean | ((
    pendingState: PendingState<T>, source: Source<T, E, R>) => boolean),
}

export interface ConfigWithKeyWithSelector<T, E, R, S> extends ConfigWithKeyWithoutSelector<T, E, R> {
  selector: useSelector<T, E, R, S>,
  areEqual?: EqualityFn<S>,
}

export interface ConfigWithKeyWithoutSelector<T, E, R> extends BaseConfig<T, E, R> {
  key: string,
}

export interface ConfigWithSourceWithSelector<T, E, R, S> extends ConfigWithSourceWithoutSelector<T, E, R> {
  selector: useSelector<T, E, R, S>,
  areEqual?: EqualityFn<S>,
}

export interface ConfigWithSourceWithoutSelector<T, E, R> extends BaseConfig<T, E, R> {
  source: Source<T, E, R>,
}

export interface ConfigWithProducerWithSelector<T, E, R, S> extends ConfigWithProducerWithoutSelector<T, E, R> {
  selector: useSelector<T, E, R, S>,
  areEqual?: EqualityFn<S>,
}

export interface ConfigWithProducerWithoutSelector<T, E, R> extends BaseConfig<T, E, R> {
  producer?: Producer<T, E, R>,
}

export type MixedConfig<T, E = any, R = any, S = any> =
  string
  | undefined
  | Source<T, E, R>
  | Producer<T, E, R>
  |
  ConfigWithKeyWithSelector<T, E, R, S>
  |
  ConfigWithKeyWithoutSelector<T, E, R>
  |
  ConfigWithSourceWithSelector<T, E, R, S>
  |
  ConfigWithSourceWithoutSelector<T, E, R>
  |
  ConfigWithProducerWithSelector<T, E, R, S>
  |
  ConfigWithProducerWithoutSelector<T, E, R>;


export type UseAsyncStateConfiguration<T, E = any, R = any, S = State<T, E, R>> = {
  key?: string,
  lane?: string,
  source?: Source<T, E, R>,
  producer?: Producer<T, E, R>,
  skipPendingDelayMs?: number,
  skipPendingStatus?: boolean,
  cacheConfig?: CacheConfig<T, E, R>,
  runEffectDurationMs?: number,
  resetStateOnDispose?: boolean,
  payload?: Record<string, any>,
  runEffect?: RunEffect,
  initialValue?: T | ((cache: Record<string, CachedState<T, E, R>>) => T),

  fork?: boolean,
  forkConfig?: ForkConfig,

  hoist?: boolean,
  hoistConfig?: hoistConfig,

  lazy?: boolean,
  autoRunArgs?: any[],
  condition?: boolean | ((state: State<T, E, R>) => boolean),
  areEqual: EqualityFn<S>,
  subscriptionKey?: string,
  selector: useSelector<T, E, R, S>,
  events?: UseAsyncStateEvents<T, E, R>,

  // dev only
  hideFromDevtools?: boolean,
}

export type StateBoundaryProps<T, E, R, S> = {
  children: React.ReactNode,
  config: MixedConfig<T, E, R, S>,

  dependencies?: any[],
  strategy?: RenderStrategy,

  render?: StateBoundaryRenderProp,
}

export type StateBoundaryRenderProp = Record<Status, ReactNode>

export type UseAsyncStateEventProps<T, E = any, R = any> = {
  state: State<T, E, R>,
  source: Source<T, E, R>,
};

export type UseAsyncStateChangeEventHandler<T, E = any, R = any> =
  ((props: UseAsyncStateEventProps<T, E, R>) => void)

export type UseAsyncStateEventFn<T, E = any, R = any> =
  UseAsyncStateChangeEvent<T, E, R>
  |
  UseAsyncStateChangeEventHandler<T, E, R>;

export type UseAsyncStateChangeEvent<T, E = any, R = any> = {
  status: Status
  handler: UseAsyncStateChangeEventHandler<T, E, R>,
}

export type UseAsyncStateEventSubscribe<T, E, R> =
  ((props: SubscribeEventProps<T, E, R>) => CleanupFn)
  | ((props: SubscribeEventProps<T, E, R>) => CleanupFn)[]

export type UseAsyncStateEvents<T, E = any, R = any> = {
  change?: UseAsyncStateEventFn<T, E, R> | UseAsyncStateEventFn<T, E, R>[],
  subscribe?: UseAsyncStateEventSubscribe<T, E, R>,
}

export type SubscribeEventProps<T, E = any, R = any> = Source<T, E, R>

export type useSelector<T, E, R, S> =
  (
    currentState: State<T, E, R>, lastSuccess: State<T, E, R>,
    cache: { [id: string]: CachedState<T, E, R> } | null
  ) => S;

export type PartialUseAsyncStateConfiguration<T, E, R, S> = Partial<UseAsyncStateConfiguration<T, E, R, S>>

export type UseAsyncStateContextType = StateContextValue | null;


export type CleanupFn = AbortFn
  | (() => void)
  | undefined;

export interface UseAsyncStateType<T, E = any, R = any, S = State<T, E, R>> {
  (
    subscriptionConfig: MixedConfig<T, E, R, S>,
    dependencies?: any[]
  ): UseAsyncState<T, E, R, S>,

  auto(
    subscriptionConfig: MixedConfig<T, E, R, S>,
    dependencies?: any[]
  ): UseAsyncState<T, E, R, S>,

  lazy(
    subscriptionConfig: MixedConfig<T, E, R, S>,
    dependencies?: any[]
  ): UseAsyncState<T, E, R, S>,

  fork(
    subscriptionConfig: MixedConfig<T, E, R, S>,
    dependencies?: any[]
  ): UseAsyncState<T, E, R, S>,

  hoist(
    subscriptionConfig: MixedConfig<T, E, R, S>,
    dependencies?: any[]
  ): UseAsyncState<T, E, R, S>,

  forkAuto(
    subscriptionConfig: MixedConfig<T, E, R, S>,
    dependencies?: any[]
  ): UseAsyncState<T, E, R, S>,

  hoistAuto(
    subscriptionConfig: MixedConfig<T, E, R, S>,
    dependencies?: any[]
  ): UseAsyncState<T, E, R, S>,
}

export type BaseSelectorKey = string | Source<any, any, any>

export type UseSelectorFunctionKeys = ((allKeys: string[]) => BaseSelectorKey[]);

export type SelectorKeysArg =
  BaseSelectorKey
  | BaseSelectorKey[]
  | UseSelectorFunctionKeys

