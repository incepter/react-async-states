import {
  AbortFn,
  CacheConfig,
  CachedState,
  ErrorState,
  InitialState,
  LastSuccessSavedState,
  PendingState,
  Producer,
  ProducerConfig,
  RunEffect,
  Source,
  State,
  StateInterface,
  SuccessState,
} from "async-states";

export type UseAsyncState<
  TData,
  A extends unknown[] = unknown[],
  E = unknown,
  S = State<TData, A, E>,
> = LegacyHookReturn<TData, A, E, S>;

export type EqualityFn<TData> = (prev: TData, next: TData) => boolean;

export interface BaseConfig<TData, A extends unknown[], E>
  extends ProducerConfig<TData, A, E> {
  key?: string;
  lane?: string;
  concurrent?: boolean;
  source?: Source<TData, A, E>;
  autoRunArgs?: A;
  producer?: Producer<TData, A, E>;
  subscriptionKey?: string;
  payload?: Record<string, unknown>;
  events?: UseAsyncStateEvents<TData, A, E>;

  lazy?: boolean;
  condition?:
    | boolean
    | ((
        state: State<TData, A, E>,
        args?: A,
        payload?: Record<string, unknown> | null
      ) => boolean);
}

export interface ConfigWithKeyWithSelector<TData, A extends unknown[], E, S>
  extends ConfigWithKeyWithoutSelector<TData, A, E> {
  selector: UseSelector<TData, A, E, S>;
  areEqual?: EqualityFn<S>;
}

export interface ConfigWithKeyWithoutSelector<TData, A extends unknown[], E>
  extends BaseConfig<TData, A, E> {
  key: string;
}

export interface ConfigWithSourceWithSelector<TData, A extends unknown[], E, S>
  extends ConfigWithSourceWithoutSelector<TData, A, E> {
  selector: UseSelector<TData, A, E, S>;
  areEqual?: EqualityFn<S>;
}

export interface ConfigWithSourceWithoutSelector<TData, A extends unknown[], E>
  extends BaseConfig<TData, A, E> {
  source: Source<TData, A, E>;
}

export interface ConfigWithProducerWithSelector<TData, A extends unknown[], E, S>
  extends ConfigWithProducerWithoutSelector<TData, A, E> {
  selector: UseSelector<TData, A, E, S>;
  areEqual?: EqualityFn<S>;
}

export interface ConfigWithProducerWithoutSelector<TData, A extends unknown[], E>
  extends BaseConfig<TData, A, E> {
  producer?: Producer<TData, A, E>;
}

export type MixedConfig<TData, A extends unknown[], E, S = State<TData, A, E>> =
  | string
  | undefined
  | Source<TData, A, E>
  | Producer<TData, A, E>
  | ConfigWithKeyWithSelector<TData, A, E, S>
  | ConfigWithKeyWithoutSelector<TData, A, E>
  | ConfigWithSourceWithSelector<TData, A, E, S>
  | ConfigWithSourceWithoutSelector<TData, A, E>
  | ConfigWithProducerWithSelector<TData, A, E, S>
  | ConfigWithProducerWithoutSelector<TData, A, E>;
export type UseAsyncStateConfiguration<
  TData,
  A extends unknown[],
  E,
  S = State<TData, A, E>,
> = {
  key?: string;
  storeInContext?: boolean;

  lane?: string;
  source?: Source<TData, A, E>;
  producer?: Producer<TData, A, E>;
  skipPendingDelayMs?: number;
  skipPendingStatus?: boolean;
  cacheConfig?: CacheConfig<TData, A, E>;
  runEffectDurationMs?: number;
  resetStateOnDispose?: boolean;
  payload?: Record<string, unknown>;
  runEffect?: RunEffect;
  initialValue?:
    | TData
    | ((cache: Record<string, CachedState<TData, A, E>> | null) => TData);

  context?: unknown;
  concurrent?: boolean;

  lazy?: boolean;
  autoRunArgs?: A;
  condition?:
    | boolean
    | ((
        state: State<TData, A, E>,
        args: A,
        payload: Record<string, unknown>
      ) => boolean);
  areEqual: EqualityFn<S>;
  subscriptionKey?: string;
  selector?: UseSelector<TData, A, E, S>;
  events?: UseAsyncStateEvents<TData, A, E>;

  // dev only
  hideFromDevtools?: boolean;
};

export type UseAsyncChangeEventProps<TData, A extends unknown[], E> =
  | UseAsyncStateEventPropsInitial<TData, A, E>
  | UseAsyncStateEventPropsPending<TData, A, E>
  | UseAsyncStateEventPropsSuccess<TData, A, E>
  | UseAsyncStateEventPropsError<TData, A, E>;

export type UseAsyncStateEventPropsInitial<TData, A extends unknown[], E> = {
  state: InitialState<TData, A>;
  source: Source<TData, A, E>;
};
export type UseAsyncStateEventPropsPending<TData, A extends unknown[], E> = {
  state: PendingState<TData, A, E>;
  source: Source<TData, A, E>;
};
export type UseAsyncStateEventPropsSuccess<TData, A extends unknown[], E> = {
  state: SuccessState<TData, A>;
  source: Source<TData, A, E>;
};
export type UseAsyncStateEventPropsError<TData, A extends unknown[], E> = {
  state: ErrorState<TData, A, E>;
  source: Source<TData, A, E>;
};

export type UseAsyncStateEvents<TData, A extends unknown[], E> = {
  change?: UseAsyncStateEventFn<TData, A, E> | UseAsyncStateEventFn<TData, A, E>[];
  subscribe?: UseAsyncStateEventSubscribe<TData, A, E>;
};

export type UseAsyncStateChangeEventHandler<TData, A extends unknown[], E> =
  | UseAsyncChangeEventInitial<TData, A, E>
  | UseAsyncChangeEventSuccess<TData, A, E>
  | UseAsyncChangeEventPending<TData, A, E>
  | UseAsyncStateChangeEventHandlerError<TData, A, E>;

export type UseAsyncChangeEventInitial<TData, A extends unknown[], E> = (
  props: UseAsyncStateEventPropsInitial<TData, A, E>
) => void;
export type UseAsyncChangeEventSuccess<TData, A extends unknown[], E> = (
  props: UseAsyncStateEventPropsSuccess<TData, A, E>
) => void;
export type UseAsyncChangeEventPending<TData, A extends unknown[], E> = (
  props: UseAsyncStateEventPropsPending<TData, A, E>
) => void;
export type UseAsyncStateChangeEventHandlerError<TData, A extends unknown[], E> = (
  props: UseAsyncStateEventPropsError<TData, A, E>
) => void;

export type UseAsyncStateEventFn<TData, A extends unknown[], E> =
  | UseAsyncStateChangeEvent<TData, A, E>
  | UseAsyncStateChangeEventHandler<TData, A, E>;

export type UseAsyncStateChangeEvent<TData, A extends unknown[], E> =
  | UseAsyncStateChangeEventInitial<TData, A, E>
  | UseAsyncStateChangeEventPending<TData, A, E>
  | UseAsyncStateChangeEventSuccess<TData, A, E>
  | UseAsyncStateChangeEventError<TData, A, E>;

export type UseAsyncStateChangeEventInitial<TData, A extends unknown[], E> = {
  status: "initial";
  handler: UseAsyncChangeEventInitial<TData, A, E>;
};
export type UseAsyncStateChangeEventPending<TData, A extends unknown[], E> = {
  status: "pending";
  handler: UseAsyncChangeEventPending<TData, A, E>;
};
export type UseAsyncStateChangeEventSuccess<TData, A extends unknown[], E> = {
  status: "success";
  handler: UseAsyncChangeEventSuccess<TData, A, E>;
};
export type UseAsyncStateChangeEventError<TData, A extends unknown[], E> = {
  status: "error";
  handler: UseAsyncStateChangeEventHandlerError<TData, A, E>;
};

export type UseAsyncStateEventSubscribe<TData, A extends unknown[], E> =
  | ((props: SubscribeEventProps<TData, A, E>) => CleanupFn)
  | ((props: SubscribeEventProps<TData, A, E>) => CleanupFn)[];

export type UseAsyncStateEventSubscribeFunction<TData, A extends unknown[], E> = (
  prevEvents: UseAsyncStateEventSubscribe<TData, A, E> | null
) => UseAsyncStateEventSubscribe<TData, A, E>;

export type SubscribeEventProps<TData, A extends unknown[], E> = Source<TData, A, E>;
export type UseSelector<TData, A extends unknown[], E, S> = (
  currentState: State<TData, A, E>,
  lastSuccess: LastSuccessSavedState<TData, A>,
  cache: { [id: string]: CachedState<TData, A, E> } | null
) => S;

export type PartialUseAsyncConfig<TData, A extends unknown[], E, S> = Partial<
  UseAsyncStateConfiguration<TData, A, E, S>
>;

export type CleanupFn = AbortFn | (() => void) | undefined;

interface BaseHooksReturn<TData, A extends unknown[], E, S = State<TData, A, E>> {
  source: Source<TData, A, E>;
  read(suspend?: boolean, throwError?: boolean): S;

  onChange(
    events: HookChangeEventsFunction<TData, A, E> | HookChangeEvents<TData, A, E>
  ): void;

  onSubscribe(
    events:
      | UseAsyncStateEventSubscribeFunction<TData, A, E>
      | UseAsyncStateEventSubscribe<TData, A, E>
  ): void;
}

export interface HookReturnInitial<TData, A extends unknown[], E, S>
  extends BaseHooksReturn<TData, A, E, S> {
  state: S;

  isError: false;
  isInitial: true;
  isSuccess: false;
  isPending: false;

  error: null;
  data: TData | null;
}

export interface HookReturnSuccess<TData, A extends unknown[], E, S>
  extends BaseHooksReturn<TData, A, E, S> {
  state: S;

  isError: false;
  isInitial: false;
  isSuccess: true;
  isPending: false;

  data: TData;
  error: null;
}

export interface HookReturnError<TData, A extends unknown[], E, S>
  extends BaseHooksReturn<TData, A, E, S> {
  state: S;

  isError: true;
  isInitial: false;
  isSuccess: false;
  isPending: false;

  error: E;
  data: TData | null;
}

export interface HookReturnPending<TData, A extends unknown[], E, S>
  extends BaseHooksReturn<TData, A, E, S> {
  state: S;

  isError: false;
  isPending: true;
  isInitial: false;
  isSuccess: false;

  data: TData | null;
  error: E | null;
}

export type LegacyHookReturn<TData, A extends unknown[], E, S = State<TData, A, E>> =
  | HookReturnInitial<TData, A, E, S>
  | HookReturnPending<TData, A, E, S>
  | HookReturnSuccess<TData, A, E, S>
  | HookReturnError<TData, A, E, S>;

export type ModernHookReturn<TData, A extends unknown[], E, S = State<TData, A, E>> =
  | HookReturnInitial<TData, A, E, S>
  | HookReturnSuccess<TData, A, E, S>;

export type HookChangeEvents<TData, A extends unknown[], E> =
  | UseAsyncStateEventFn<TData, A, E>
  | UseAsyncStateEventFn<TData, A, E>[];

export type HookChangeEventsFunction<TData, A extends unknown[], E> = (
  prev: HookChangeEvents<TData, A, E> | null
) => HookChangeEvents<TData, A, E>;

export interface HookSubscription<TData, A extends unknown[], E, S>
  extends SubscriptionAlternate<TData, A, E, S> {
  alternate: SubscriptionAlternate<TData, A, E, S> | null;
  read(suspend?: boolean, throwError?: boolean): S;

  changeEvents: HookChangeEvents<TData, A, E> | null;
  subscribeEvents: UseAsyncStateEventSubscribe<TData, A, E> | null;
  onChange(
    events:
      | ((prevEvents: HookChangeEvents<TData, A, E> | null) => void)
      | HookChangeEvents<TData, A, E>
  ): void;

  onSubscribe(
    events:
      | ((prevEvents: UseAsyncStateEventSubscribe<TData, A, E> | null) => void)
      | UseAsyncStateEventSubscribe<TData, A, E>
  ): void;
}

export interface SubscriptionAlternate<TData, A extends unknown[], E, S> {
  deps: unknown[];
  version: number;
  instance: StateInterface<TData, A, E>;
  return: LegacyHookReturn<TData, A, E, S>;
  update: React.Dispatch<React.SetStateAction<number>>;

  config: PartialUseAsyncConfig<TData, A, E, S>;

  // dev mode properties
  at?: string | null;
  __DEV__?: {
    didAddLastSuccessGetter: boolean;
    didWarnAboutLastSuccessUsage: boolean;
  };
}

// no suspending unless read is called in userland
// will automatically refetch data after a state time is elapsed
// will automatically refetch on window focus and stale data
interface UseQueryReturn<TData, TArgs extends unknown[], TError>
  extends BaseHooksReturn<TData, TArgs, TError> {
  isPending: boolean;

  data: TData | null;
  error: TError | null;
}
