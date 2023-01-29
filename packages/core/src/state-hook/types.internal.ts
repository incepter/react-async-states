import {
  AbortFn,
  CacheConfig,
  CachedState,
  ForkConfig,
  InitialState,
  Producer,
  ProducerConfig,
  Source,
  State,
  SuccessState
} from "../types";
import {RunEffect, Status} from "../enums";
import {HookChangeEvents} from "./StateHook";

export interface BaseUseAsyncState<T, E, R, S = State<T, E, R>> extends Source<T, E, R> {
  flags?: number,
  source?: Source<T, E, R>,
  devFlags?: string[],
  onChange(
    events: ((prevEvents?: HookChangeEvents<T, E, R>) => void)| HookChangeEvents<T, E, R>
  ): void,
}
export interface UseAsyncState<T, E = any, R = any, S = State<T, E, R>> extends BaseUseAsyncState<T, E, R, S> {
  state: S,
  read(suspend?: boolean, throwError?: boolean): S,
  version?: number,
  lastSuccess?: SuccessState<T> | InitialState<T>,
}

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

  wait?: boolean,
  lazy?: boolean,
  condition?: boolean | ((state: State<T, E, R>) => boolean),

  fork?: boolean,
  forkConfig?: ForkConfig
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

  lazy?: boolean,
  autoRunArgs?: any[],
  condition?: boolean | ((state: State<T, E, R>) => boolean),
  areEqual: EqualityFn<S>,
  subscriptionKey?: string,
  selector: useSelector<T, E, R, S>,
  events?: UseAsyncStateEvents<T, E, R>,

  pool?: string,
  wait?: boolean,

  // dev only
  hideFromDevtools?: boolean,
}

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