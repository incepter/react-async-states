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
  ProducerSavedProps,
  RunEffect,
  Source,
  State,
  StateInterface,
  SuccessState,
} from "async-states";

export type UseAsyncState<
  TData,
  TArgs extends unknown[] = unknown[],
  TError = Error,
  S = State<TData, TArgs, TError>,
> = LegacyHookReturn<TData, TArgs, TError, S>;

export type EqualityFn<TData> = (prev: TData, next: TData) => boolean;

export interface BaseConfig<TData, TArgs extends unknown[], TError>
  extends ProducerConfig<TData, TArgs, TError> {
  key?: string;
  lane?: string;
  concurrent?: boolean;
  source?: Source<TData, TArgs, TError>;
  autoRunArgs?: TArgs;
  producer?: Producer<TData, TArgs, TError>;
  subscriptionKey?: string;
  payload?: Record<string, unknown>;
  events?: UseAsyncStateEvents<TData, TArgs, TError>;

  lazy?: boolean;
  condition?:
    | boolean
    | ((
        state: State<TData, TArgs, TError>,
        args?: TArgs,
        payload?: Record<string, unknown> | null
      ) => boolean);
}

export interface ConfigWithKeyWithSelector<
  TData,
  TArgs extends unknown[],
  TError,
  S,
> extends ConfigWithKeyWithoutSelector<TData, TArgs, TError> {
  selector: UseSelector<TData, TArgs, TError, S>;
  areEqual?: EqualityFn<S>;
}

export interface ConfigWithKeyWithoutSelector<
  TData,
  TArgs extends unknown[],
  TError,
> extends BaseConfig<TData, TArgs, TError> {
  key: string;
}

export interface ConfigWithSourceWithSelector<
  TData,
  TArgs extends unknown[],
  TError,
  S,
> extends ConfigWithSourceWithoutSelector<TData, TArgs, TError> {
  selector: UseSelector<TData, TArgs, TError, S>;
  areEqual?: EqualityFn<S>;
}

export interface ConfigWithSourceWithoutSelector<
  TData,
  TArgs extends unknown[],
  TError,
> extends BaseConfig<TData, TArgs, TError> {
  source: Source<TData, TArgs, TError>;
}

export interface ConfigWithProducerWithSelector<
  TData,
  TArgs extends unknown[],
  TError,
  S,
> extends ConfigWithProducerWithoutSelector<TData, TArgs, TError> {
  selector: UseSelector<TData, TArgs, TError, S>;
  areEqual?: EqualityFn<S>;
}

export interface ConfigWithProducerWithoutSelector<
  TData,
  TArgs extends unknown[],
  TError,
> extends BaseConfig<TData, TArgs, TError> {
  producer?: Producer<TData, TArgs, TError>;
}

export type MixedConfig<
  TData,
  TArgs extends unknown[],
  TError,
  S = State<TData, TArgs, TError>,
> =
  | string
  | undefined
  | Source<TData, TArgs, TError>
  | Producer<TData, TArgs, TError>
  | ConfigWithKeyWithSelector<TData, TArgs, TError, S>
  | ConfigWithKeyWithoutSelector<TData, TArgs, TError>
  | ConfigWithSourceWithSelector<TData, TArgs, TError, S>
  | ConfigWithSourceWithoutSelector<TData, TArgs, TError>
  | ConfigWithProducerWithSelector<TData, TArgs, TError, S>
  | ConfigWithProducerWithoutSelector<TData, TArgs, TError>;
export type UseAsyncStateConfiguration<
  TData,
  TArgs extends unknown[],
  TError,
  S = State<TData, TArgs, TError>,
> = {
  key?: string;
  storeInContext?: boolean;

  lane?: string;
  source?: Source<TData, TArgs, TError>;
  producer?: Producer<TData, TArgs, TError>;
  skipPendingDelayMs?: number;
  skipPendingStatus?: boolean;
  cacheConfig?: CacheConfig<TData, TArgs, TError>;
  runEffectDurationMs?: number;
  resetStateOnDispose?: boolean;
  payload?: Record<string, unknown>;
  runEffect?: RunEffect;
  initialValue?:
    | TData
    | ((
        cache: Record<string, CachedState<TData, TArgs, TError>> | null
      ) => TData);

  context?: unknown;
  concurrent?: boolean;

  lazy?: boolean;
  autoRunArgs?: TArgs;
  condition?:
    | boolean
    | ((
        state: State<TData, TArgs, TError>,
        args: TArgs,
        payload: Record<string, unknown>
      ) => boolean);
  areEqual: EqualityFn<S>;
  subscriptionKey?: string;
  selector?: UseSelector<TData, TArgs, TError, S>;
  events?: UseAsyncStateEvents<TData, TArgs, TError>;

  // dev only
  hideFromDevtools?: boolean;
};

export type UseAsyncChangeEventProps<TData, TArgs extends unknown[], TError> =
  | UseAsyncStateEventPropsInitial<TData, TArgs, TError>
  | UseAsyncStateEventPropsPending<TData, TArgs, TError>
  | UseAsyncStateEventPropsSuccess<TData, TArgs, TError>
  | UseAsyncStateEventPropsError<TData, TArgs, TError>;

export type UseAsyncStateEventPropsInitial<
  TData,
  TArgs extends unknown[],
  TError,
> = {
  state: InitialState<TData, TArgs>;
  source: Source<TData, TArgs, TError>;
};
export type UseAsyncStateEventPropsPending<
  TData,
  TArgs extends unknown[],
  TError,
> = {
  state: PendingState<TData, TArgs, TError>;
  source: Source<TData, TArgs, TError>;
};
export type UseAsyncStateEventPropsSuccess<
  TData,
  TArgs extends unknown[],
  TError,
> = {
  state: SuccessState<TData, TArgs>;
  source: Source<TData, TArgs, TError>;
};
export type UseAsyncStateEventPropsError<
  TData,
  TArgs extends unknown[],
  TError,
> = {
  state: ErrorState<TData, TArgs, TError>;
  source: Source<TData, TArgs, TError>;
};

export type UseAsyncStateEvents<TData, TArgs extends unknown[], TError> = {
  change?:
    | UseAsyncStateEventFn<TData, TArgs, TError>
    | UseAsyncStateEventFn<TData, TArgs, TError>[];
  subscribe?: UseAsyncStateEventSubscribe<TData, TArgs, TError>;
};

export type UseAsyncStateChangeEventHandler<
  TData,
  TArgs extends unknown[],
  TError,
> =
  | UseAsyncChangeEventInitial<TData, TArgs, TError>
  | UseAsyncChangeEventSuccess<TData, TArgs, TError>
  | UseAsyncChangeEventPending<TData, TArgs, TError>
  | UseAsyncStateChangeEventHandlerError<TData, TArgs, TError>;

export type UseAsyncChangeEventInitial<
  TData,
  TArgs extends unknown[],
  TError,
> = (props: UseAsyncStateEventPropsInitial<TData, TArgs, TError>) => void;
export type UseAsyncChangeEventSuccess<
  TData,
  TArgs extends unknown[],
  TError,
> = (props: UseAsyncStateEventPropsSuccess<TData, TArgs, TError>) => void;
export type UseAsyncChangeEventPending<
  TData,
  TArgs extends unknown[],
  TError,
> = (props: UseAsyncStateEventPropsPending<TData, TArgs, TError>) => void;
export type UseAsyncStateChangeEventHandlerError<
  TData,
  TArgs extends unknown[],
  TError,
> = (props: UseAsyncStateEventPropsError<TData, TArgs, TError>) => void;

export type UseAsyncStateEventFn<TData, TArgs extends unknown[], TError> =
  | UseAsyncStateChangeEvent<TData, TArgs, TError>
  | UseAsyncStateChangeEventHandler<TData, TArgs, TError>;

export type UseAsyncStateChangeEvent<TData, TArgs extends unknown[], TError> =
  | UseAsyncStateChangeEventInitial<TData, TArgs, TError>
  | UseAsyncStateChangeEventPending<TData, TArgs, TError>
  | UseAsyncStateChangeEventSuccess<TData, TArgs, TError>
  | UseAsyncStateChangeEventError<TData, TArgs, TError>;

export type UseAsyncStateChangeEventInitial<
  TData,
  TArgs extends unknown[],
  TError,
> = {
  status: "initial";
  handler: UseAsyncChangeEventInitial<TData, TArgs, TError>;
};
export type UseAsyncStateChangeEventPending<
  TData,
  TArgs extends unknown[],
  TError,
> = {
  status: "pending";
  handler: UseAsyncChangeEventPending<TData, TArgs, TError>;
};
export type UseAsyncStateChangeEventSuccess<
  TData,
  TArgs extends unknown[],
  TError,
> = {
  status: "success";
  handler: UseAsyncChangeEventSuccess<TData, TArgs, TError>;
};
export type UseAsyncStateChangeEventError<
  TData,
  TArgs extends unknown[],
  TError,
> = {
  status: "error";
  handler: UseAsyncStateChangeEventHandlerError<TData, TArgs, TError>;
};

export type UseAsyncStateEventSubscribe<
  TData,
  TArgs extends unknown[],
  TError,
> =
  | ((props: SubscribeEventProps<TData, TArgs, TError>) => CleanupFn)
  | ((props: SubscribeEventProps<TData, TArgs, TError>) => CleanupFn)[];

export type UseAsyncStateEventSubscribeFunction<
  TData,
  TArgs extends unknown[],
  TError,
> = (
  prevEvents: UseAsyncStateEventSubscribe<TData, TArgs, TError> | null
) => UseAsyncStateEventSubscribe<TData, TArgs, TError>;

export type SubscribeEventProps<
  TData,
  TArgs extends unknown[],
  TError,
> = Source<TData, TArgs, TError>;
export type UseSelector<TData, TArgs extends unknown[], TError, S> = (
  currentState: State<TData, TArgs, TError>,
  lastSuccess: LastSuccessSavedState<TData, TArgs>,
  cache: { [id: string]: CachedState<TData, TArgs, TError> } | null
) => S;

export type PartialUseAsyncConfig<
  TData,
  TArgs extends unknown[],
  TError,
  S,
> = Partial<UseAsyncStateConfiguration<TData, TArgs, TError, S>>;

export type CleanupFn = AbortFn | (() => void) | undefined;

interface BaseHooksReturn<
  TData,
  TArgs extends unknown[],
  TError,
  S = State<TData, TArgs, TError>,
> {
  source: Source<TData, TArgs, TError>;
  read(suspend?: boolean, throwError?: boolean): S;

  onChange(
    events:
      | HookChangeEventsFunction<TData, TArgs, TError>
      | HookChangeEvents<TData, TArgs, TError>
  ): void;

  onSubscribe(
    events:
      | UseAsyncStateEventSubscribeFunction<TData, TArgs, TError>
      | UseAsyncStateEventSubscribe<TData, TArgs, TError>
  ): void;
}

export interface HookReturnInitial<TData, TArgs extends unknown[], TError, S>
  extends BaseHooksReturn<TData, TArgs, TError, S> {
  state: S;

  isError: false;
  isInitial: true;
  isSuccess: false;
  isPending: false;

  error: null;
  data: TData | null;
  dataProps: ProducerSavedProps<TData, TArgs>;
}

export interface HookReturnSuccess<TData, TArgs extends unknown[], TError, S>
  extends BaseHooksReturn<TData, TArgs, TError, S> {
  state: S;

  isError: false;
  isInitial: false;
  isSuccess: true;
  isPending: false;

  error: null;
  data: TData;
  dataProps: ProducerSavedProps<TData, TArgs>;
}

export interface HookReturnError<TData, TArgs extends unknown[], TError, S>
  extends BaseHooksReturn<TData, TArgs, TError, S> {
  state: S;

  isError: true;
  isInitial: false;
  isSuccess: false;
  isPending: false;

  error: TError;
  data: TData | null;
  dataProps: ProducerSavedProps<TData, TArgs>;
}

export interface HookReturnPending<TData, TArgs extends unknown[], TError, S>
  extends BaseHooksReturn<TData, TArgs, TError, S> {
  state: S;

  isError: false;
  isPending: true;
  isInitial: false;
  isSuccess: false;

  error: TError | null;
  data: TData | null;
  dataProps: ProducerSavedProps<TData, TArgs>;
}

export type LegacyHookReturn<
  TData,
  TArgs extends unknown[],
  TError,
  S = State<TData, TArgs, TError>,
> =
  | HookReturnInitial<TData, TArgs, TError, S>
  | HookReturnPending<TData, TArgs, TError, S>
  | HookReturnSuccess<TData, TArgs, TError, S>
  | HookReturnError<TData, TArgs, TError, S>;

export type ModernHookReturn<
  TData,
  TArgs extends unknown[],
  TError,
  S = State<TData, TArgs, TError>,
> =
  | HookReturnInitial<TData, TArgs, TError, S>
  | HookReturnSuccess<TData, TArgs, TError, S>;

export type HookChangeEvents<TData, TArgs extends unknown[], TError> =
  | UseAsyncStateEventFn<TData, TArgs, TError>
  | UseAsyncStateEventFn<TData, TArgs, TError>[];

export type HookChangeEventsFunction<TData, TArgs extends unknown[], TError> = (
  prev: HookChangeEvents<TData, TArgs, TError> | null
) => HookChangeEvents<TData, TArgs, TError>;

export interface HookSubscription<TData, TArgs extends unknown[], TError, S>
  extends SubscriptionAlternate<TData, TArgs, TError, S> {
  alternate: SubscriptionAlternate<TData, TArgs, TError, S> | null;
  read(suspend?: boolean, throwError?: boolean): S;

  changeEvents: HookChangeEvents<TData, TArgs, TError> | null;
  subscribeEvents: UseAsyncStateEventSubscribe<TData, TArgs, TError> | null;
  onChange(
    events:
      | ((prevEvents: HookChangeEvents<TData, TArgs, TError> | null) => void)
      | HookChangeEvents<TData, TArgs, TError>
  ): void;

  onSubscribe(
    events:
      | ((
          prevEvents: UseAsyncStateEventSubscribe<TData, TArgs, TError> | null
        ) => void)
      | UseAsyncStateEventSubscribe<TData, TArgs, TError>
  ): void;
}

export interface SubscriptionAlternate<
  TData,
  TArgs extends unknown[],
  TError,
  S,
> {
  deps: unknown[];
  version: number;
  instance: StateInterface<TData, TArgs, TError>;
  return: LegacyHookReturn<TData, TArgs, TError, S>;
  update: React.Dispatch<React.SetStateAction<number>>;

  config: PartialUseAsyncConfig<TData, TArgs, TError, S>;

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
