import {
  AbortFn,
  CacheConfig,
  CachedState,
  ForkConfig,
  LastSuccessSavedState,
  Producer,
  ProducerConfig,
  Source,
  State
} from "../types";
import {RunEffect, Status} from "../enums";
import {HookChangeEvents} from "./StateHook";

export interface BaseUseAsyncState<T, E, R, A extends unknown[], S = State<T, E, R, A>> extends Source<T, E, R, A> {
  flags?: number,
  source?: Source<T, E, R, A>,
  devFlags?: string[],

  onChange(
    events: ((prevEvents?: HookChangeEvents<T, E, R, A>) => void) | HookChangeEvents<T, E, R, A>
  ): void,

  onSubscribe(
    events: ((prevEvents?: UseAsyncStateEventSubscribe<T, E, R, A>) => void) | UseAsyncStateEventSubscribe<T, E, R, A>
  ): void,
}

export interface UseAsyncState<T, E = unknown, R = unknown, A extends unknown[] = unknown[], S = State<T, E, R, A>> extends BaseUseAsyncState<T, E, R, A, S> {
  state: S,

  read(suspend?: boolean, throwError?: boolean): S,

  version?: number,
  lastSuccess?: LastSuccessSavedState<T, A>,
}

export type EqualityFn<T> = (
  prev: T,
  next: T
) => boolean;

export interface BaseConfig<T, E, R, A extends unknown[]> extends ProducerConfig<T, E, R, A> {
  key?: string,
  lane?: string,
  source?: Source<T, E, R, A>,
  autoRunArgs?: A,
  producer?: Producer<T, E, R, A>,
  subscriptionKey?: string,
  payload?: Record<string, unknown>,
  events?: UseAsyncStateEvents<T, E, R, A>,

  wait?: boolean,
  lazy?: boolean,
  condition?: boolean | ((
    state: State<T, E, R, A>,
    args?: A,
    payload?: Record<string, unknown> | null
  ) => boolean),

  fork?: boolean,
  forkConfig?: ForkConfig
}

export interface ConfigWithKeyWithSelector<T, E, R, A extends unknown[], S> extends ConfigWithKeyWithoutSelector<T, E, R, A> {
  selector: useSelector<T, E, R, A, S>,
  areEqual?: EqualityFn<S>,
}

export interface ConfigWithKeyWithoutSelector<T, E, R, A extends unknown[]> extends BaseConfig<T, E, R, A> {
  key: string,
}

export interface ConfigWithSourceWithSelector<T, E, R, A extends unknown[], S> extends ConfigWithSourceWithoutSelector<T, E, R, A> {
  selector: useSelector<T, E, R, A, S>,
  areEqual?: EqualityFn<S>,
}

export interface ConfigWithSourceWithoutSelector<T, E, R, A extends unknown[]> extends BaseConfig<T, E, R, A> {
  source: Source<T, E, R, A>,
}

export interface ConfigWithProducerWithSelector<T, E, R, A extends unknown[], S> extends ConfigWithProducerWithoutSelector<T, E, R, A> {
  selector: useSelector<T, E, R, A, S>,
  areEqual?: EqualityFn<S>,
}

export interface ConfigWithProducerWithoutSelector<T, E, R, A extends unknown[]> extends BaseConfig<T, E, R, A> {
  producer?: Producer<T, E, R, A>,
}

export type MixedConfig<T, E, R, A extends unknown[], S = State<T, E, R, A>> =
  string
  | undefined
  | Source<T, E, R, A>
  | Producer<T, E, R, A>
  |
  ConfigWithKeyWithSelector<T, E, R, A, S>
  |
  ConfigWithKeyWithoutSelector<T, E, R, A>
  |
  ConfigWithSourceWithSelector<T, E, R, A, S>
  |
  ConfigWithSourceWithoutSelector<T, E, R, A>
  |
  ConfigWithProducerWithSelector<T, E, R, A, S>
  |
  ConfigWithProducerWithoutSelector<T, E, R, A>;


export type UseAsyncStateConfiguration<T, E, R, A extends unknown[], S = State<T, E, R, A>> = {
  key?: string,
  lane?: string,
  source?: Source<T, E, R, A>,
  producer?: Producer<T, E, R, A>,
  skipPendingDelayMs?: number,
  skipPendingStatus?: boolean,
  cacheConfig?: CacheConfig<T, E, R, A>,
  runEffectDurationMs?: number,
  resetStateOnDispose?: boolean,
  payload?: Record<string, unknown>,
  runEffect?: RunEffect,
  initialValue?: T | ((cache: Record<string, CachedState<T, E, R, A>>) => T),

  fork?: boolean,
  forkConfig?: ForkConfig,

  lazy?: boolean,
  autoRunArgs?: A,
  condition?: boolean | ((state: State<T, E, R, A>) => boolean),
  areEqual: EqualityFn<S>,
  subscriptionKey?: string,
  selector: useSelector<T, E, R, A, S>,
  events?: UseAsyncStateEvents<T, E, R, A>,

  pool?: string,
  wait?: boolean,

  // dev only
  hideFromDevtools?: boolean,
}

export type UseAsyncStateEventProps<T, E, R, A extends unknown[]> = {
  state: State<T, E, R, A>,
  source: Source<T, E, R, A>,
};

export type UseAsyncStateChangeEventHandler<T, E, R, A extends unknown[]> =
  ((props: UseAsyncStateEventProps<T, E, R, A>) => void)

export type UseAsyncStateEventFn<T, E, R, A extends unknown[]> =
  UseAsyncStateChangeEvent<T, E, R, A>
  |
  UseAsyncStateChangeEventHandler<T, E, R, A>;

export type UseAsyncStateChangeEvent<T, E, R, A extends unknown[]> = {
  status: Status
  handler: UseAsyncStateChangeEventHandler<T, E, R, A>,
}

export type UseAsyncStateEventSubscribe<T, E, R, A extends unknown[]> =
  ((props: SubscribeEventProps<T, E, R, A>) => CleanupFn)
  | ((props: SubscribeEventProps<T, E, R, A>) => CleanupFn)[]

export type UseAsyncStateEvents<T, E, R, A extends unknown[]> = {
  change?: UseAsyncStateEventFn<T, E, R, A> | UseAsyncStateEventFn<T, E, R, A>[],
  subscribe?: UseAsyncStateEventSubscribe<T, E, R, A>,
}

export type SubscribeEventProps<T, E, R, A extends unknown[]> = Source<T, E, R, A>

export type useSelector<T, E, R, A extends unknown[], S> =
  (
    currentState: State<T, E, R, A>, lastSuccess: LastSuccessSavedState<T, A>,
    cache: { [id: string]: CachedState<T, E, R, A> } | null
  ) => S;

export type PartialUseAsyncStateConfiguration<T, E, R, A extends unknown[], S> = Partial<UseAsyncStateConfiguration<T, E, R, A, S>>

export type CleanupFn = AbortFn
  | (() => void)
  | undefined;

export interface UseAsyncStateType<T, E, R, A extends unknown[], S = State<T, E, R, A>> {
  (
    subscriptionConfig: MixedConfig<T, E, R, A, S>,
    dependencies?: unknown[]
  ): UseAsyncState<T, E, R, A, S>,

  auto(
    subscriptionConfig: MixedConfig<T, E, R, A, S>,
    dependencies?: unknown[]
  ): UseAsyncState<T, E, R, A, S>,

  lazy(
    subscriptionConfig: MixedConfig<T, E, R, A, S>,
    dependencies?: unknown[]
  ): UseAsyncState<T, E, R, A, S>,

  fork(
    subscriptionConfig: MixedConfig<T, E, R, A, S>,
    dependencies?: unknown[]
  ): UseAsyncState<T, E, R, A, S>,

  hoist(
    subscriptionConfig: MixedConfig<T, E, R, A, S>,
    dependencies?: unknown[]
  ): UseAsyncState<T, E, R, A, S>,

  forkAuto(
    subscriptionConfig: MixedConfig<T, E, R, A, S>,
    dependencies?: unknown[]
  ): UseAsyncState<T, E, R, A, S>,

  hoistAuto(
    subscriptionConfig: MixedConfig<T, E, R, A, S>,
    dependencies?: unknown[]
  ): UseAsyncState<T, E, R, A, S>,
}
