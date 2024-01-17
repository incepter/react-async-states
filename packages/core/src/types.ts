import { RunEffect, Status } from "./enums";

export interface BaseSource<TData, TArgs extends unknown[], TError> {
  // identity
  key: string;
  uniqueId: number;
  readonly inst: StateInterface<TData, TArgs, TError>;

  getVersion(): number;

  getPayload(): Record<string, unknown>;

  mergePayload(partialPayload?: Record<string, unknown>): void;

  // state
  getState(): State<TData, TArgs, TError>;

  setState(
    value: StateFunctionUpdater<TData, TArgs, TError> | TData,
    status: "initial",
    callbacks?: ProducerCallbacks<TData, TArgs, TError>
  ): void;
  setState(
    value: null,
    status: "pending",
    callbacks?: ProducerCallbacks<TData, TArgs, TError>
  ): void;
  setState(
    value: TError,
    status: "error",
    callbacks?: ProducerCallbacks<TData, TArgs, TError>
  ): void;
  setState(
    value: StateFunctionUpdater<TData, TArgs, TError> | TData,
    status?: "success",
    callbacks?: ProducerCallbacks<TData, TArgs, TError>
  ): void;

  setData(newData: TData | ((prevData: TData | null) => TData)): void;

  replaceState(
    newState: State<TData, TArgs, TError>,
    notify?: boolean,
    callbacks?: ProducerCallbacks<TData, TArgs, TError>
  ): void;

  // subscriptions
  subscribe(cb: (s: State<TData, TArgs, TError>) => void): AbortFn;

  subscribe(subProps: AsyncStateSubscribeProps<TData, TArgs, TError>): AbortFn;

  subscribe(
    argv:
      | ((s: State<TData, TArgs, TError>) => void)
      | AsyncStateSubscribeProps<TData, TArgs, TError>
  ): AbortFn;

  // producer
  replay(): AbortFn;

  abort(reason?: any): void;

  replaceProducer(newProducer: Producer<TData, TArgs, TError> | null): void;

  // cache
  invalidateCache(cacheKey?: string): void;

  replaceCache(
    cacheKey: string,
    cache: CachedState<TData, TArgs, TError>
  ): void;

  patchConfig(
    partialConfig?: Partial<ProducerConfig<TData, TArgs, TError>>
  ): void;
  patchConfig(
    updater?: (
      config: Partial<ProducerConfig<TData, TArgs, TError>>
    ) => Partial<ProducerConfig<TData, TArgs, TError>>
  ): void;
  patchConfig(
    updater?:
      | Partial<ProducerConfig<TData, TArgs, TError>>
      | ((
          config: Partial<ProducerConfig<TData, TArgs, TError>>
        ) => Partial<ProducerConfig<TData, TArgs, TError>>)
  ): void;

  getConfig(): ProducerConfig<TData, TArgs, TError>;

  on(
    eventType: InstanceChangeEvent,
    eventHandler: InstanceChangeEventHandlerType<TData, TArgs, TError>
  ): () => void;

  on(
    eventType: InstanceDisposeEvent,
    eventHandler: InstanceDisposeEventHandlerType<TData, TArgs, TError>
  ): () => void;

  on(
    eventType: InstanceCacheChangeEvent,
    eventHandler: InstanceCacheChangeEventHandlerType<TData, TArgs, TError>
  ): () => void;

  dispose(): boolean;
}

export type InstanceEventHandlerType<TData, TArgs extends unknown[], TError> =
  | InstanceChangeEventHandlerType<TData, TArgs, TError>
  | InstanceDisposeEventHandlerType<TData, TArgs, TError>
  | InstanceCacheChangeEventHandlerType<TData, TArgs, TError>;
export type StateChangeEventHandler<TData, TArgs extends unknown[], TError> =
  | ((newState: State<TData, TArgs, TError>) => void)
  | InstanceChangeEventObject<TData, TArgs, TError>;
export type InstanceChangeEventObject<
  TData,
  TArgs extends unknown[],
  TError,
> = {
  status: Status;
  handler: (newState: State<TData, TArgs, TError>) => void;
};
export type InstanceChangeEventHandlerType<
  TData,
  TArgs extends unknown[],
  TError,
> =
  | StateChangeEventHandler<TData, TArgs, TError>
  | StateChangeEventHandler<TData, TArgs, TError>[];
export type InstanceDisposeEventHandlerType<
  TData,
  TArgs extends unknown[],
  TError,
> = (() => void) | (() => void)[];
export type InstanceCacheChangeEventHandlerType<
  TData,
  TArgs extends unknown[],
  TError,
> =
  | ((
      cache:
        | Record<string, CachedState<TData, TArgs, TError>>
        | null
        | undefined
    ) => void)
  | ((
      cache:
        | Record<string, CachedState<TData, TArgs, TError>>
        | null
        | undefined
    ) => void)[];
export type InstanceChangeEvent = "change";
export type InstanceDisposeEvent = "dispose";
export type InstanceCacheChangeEvent = "cache-change";
export type InstanceEventType =
  | InstanceChangeEvent
  | InstanceDisposeEvent
  | InstanceCacheChangeEvent;
export type AsyncStateSubscribeProps<TData, TArgs extends unknown[], TError> = {
  key?: string;
  flags?: number;
  cb(s: State<TData, TArgs, TError>): void;
};
export type InstanceEvents<TData, TArgs extends unknown[], TError> = {
  change?: Record<number, InstanceChangeEventHandlerType<TData, TArgs, TError>>;
  dispose?: Record<
    number,
    InstanceDisposeEventHandlerType<TData, TArgs, TError>
  >;
  ["cache-change"]?: Record<
    number,
    InstanceCacheChangeEventHandlerType<TData, TArgs, TError>
  >;
};

export type HydrationData<TData, TArgs extends unknown[], TError> = {
  state: State<TData, TArgs, TError>;
  payload: Record<string, unknown>;
  latestRun: RunTask<TData, TArgs, TError> | null;
};

export interface PromiseLike<TData, TError> extends Promise<TData> {
  status: "pending" | "fulfilled" | "rejected";
  value?: TData;
  reason?: TError;
}

export type SourceHydration<TData, TArgs extends unknown[], TError> = [
  State<TData, TArgs, TError>,
  RunTask<TData, TArgs, TError> | null,
  Record<string, any> | null,
];

export interface StateInterface<TData, TArgs extends unknown[], TError> {
  // identity
  key: string;
  version: number;
  id: number;
  actions: Source<TData, TArgs, TError>;
  config: ProducerConfig<TData, TArgs, TError>;
  payload: Record<string, any> | null;

  // state
  state: State<TData, TArgs, TError>;
  lastSuccess: LastSuccessSavedState<TData, TArgs>;

  pendingUpdate: PendingUpdate | null;
  pendingTimeout: PendingTimeout | null;

  queue: UpdateQueue<TData, TArgs, TError> | null;

  // subscriptions
  subsIndex: number | null;
  subscriptions: Record<number, StateSubscription<TData, TArgs, TError>> | null;

  // producer
  promise: PromiseLike<TData, TError> | null;
  fn: Producer<TData, TArgs, TError> | null;
  readonly ctx: LibraryContext | null;

  latestRun: RunTask<TData, TArgs, TError> | null;
  currentAbort: AbortFn | null;

  // lanes and forks
  parent: StateInterface<TData, TArgs, TError> | null;
  lanes: Record<string, StateInterface<TData, TArgs, TError>> | null;

  // cache
  cache: Record<string, CachedState<TData, TArgs, TError>> | null;

  events: InstanceEvents<TData, TArgs, TError> | null;
  eventsIndex: number | null;
  // dev properties
  journal?: any[] | null; // for devtools, dev only
}

export interface RUNCProps<TData, TArgs extends unknown[], TError>
  extends ProducerCallbacks<TData, TArgs, TError> {
  args?: TArgs;
}

export type LastSuccessSavedState<TData, TArgs extends unknown[]> =
  | InitialState<TData, TArgs>
  | SuccessState<TData, TArgs>;

export interface BaseState<TData, TArgs extends unknown[]> {
  data: TData;
  status: Status;
  timestamp: number;
  props: ProducerSavedProps<TData, TArgs>;
}

export type SuccessState<TData, TArgs extends unknown[]> = {
  data: TData;
  timestamp: number;
  status: "success";
  props: ProducerSavedProps<TData, TArgs>;
};
export type ErrorState<TData, TArgs extends unknown[], TError> = {
  data: TError;
  timestamp: number;
  status: "error";
  props: ProducerSavedProps<TData, TArgs>;
};
export type PendingState<TData, TArgs extends unknown[], TError> = {
  data: null;
  timestamp: number;
  status: "pending";
  props: ProducerSavedProps<TData, TArgs>;

  prev: PendingPreviousState<TData, TArgs, TError>;
};

export type PendingPreviousState<TData, TArgs extends unknown[], TError> =
  | InitialState<TData, TArgs>
  | SuccessState<TData, TArgs>
  | ErrorState<TData, TArgs, TError>;

export type InitialState<TData, TArgs extends unknown[]> = {
  timestamp: number;
  data: TData | undefined;
  status: "initial";
  props: ProducerSavedProps<TData, TArgs>;
};

export type State<TData, TArgs extends unknown[], TError> =
  | InitialState<TData, TArgs>
  | PendingState<TData, TArgs, TError>
  | SuccessState<TData, TArgs>
  | ErrorState<TData, TArgs, TError>;
export type AbortFn = ((reason?: any) => void) | undefined;
export type OnAbortFn<R = unknown> = (cb?: (reason?: R) => void) => void;

export interface ProducerProps<
  TData,
  TArgs extends unknown[] = [],
  TError = Error,
> {
  onAbort: OnAbortFn;
  isAborted: () => boolean;
  abort: (reason?: any) => void;

  args: TArgs;
  signal: AbortSignal;
  payload: Record<string, unknown>;
  lastSuccess: LastSuccessSavedState<TData, TArgs>;

  emit(
    value: StateFunctionUpdater<TData, TArgs, TError> | TData,
    status: "initial"
  ): void;
  emit(value: null, status: "pending"): void;
  emit(value: TError, status: "error"): void;
  emit(
    value: StateFunctionUpdater<TData, TArgs, TError> | TData,
    status?: "success"
  ): void;
  getState: () => State<TData, TArgs, TError>;
}

export type RunIndicators = {
  index: number;
  done: boolean;
  cleared: boolean;
  aborted: boolean;
};

export type ProducerCallbacks<TData, TArgs extends unknown[], TError> = {
  onError?(errorState: ErrorState<TData, TArgs, TError>): void;
  onSuccess?(successState: SuccessState<TData, TArgs>): void;
};

export type ProducerSavedProps<TData, TArgs extends unknown[]> = {
  args: TArgs;
  payload: Record<string, unknown> | null;
};

export type Producer<TData, TArgs extends unknown[] = [], TError = Error> = (
  props: ProducerProps<TData, TArgs, TError>
) => TData | Promise<TData>;

export type ProducerFunction<TData, TArgs extends unknown[], TError> = (
  props: ProducerProps<TData, TArgs, TError>,
  runIndicators: RunIndicators,
  callbacks?: ProducerCallbacks<TData, TArgs, TError>
) => AbortFn;

export type ProducerConfig<TData, TArgs extends unknown[], TError> = {
  skipPendingStatus?: boolean;
  initialValue?:
    | TData
    | ((
        cache: Record<string, CachedState<TData, TArgs, TError>> | null
      ) => TData);
  cacheConfig?: CacheConfig<TData, TArgs, TError>;
  runEffectDurationMs?: number;
  runEffect?: RunEffect;
  keepPendingForMs?: number;
  skipPendingDelayMs?: number;
  resetStateOnDispose?: boolean;
  context?: unknown;

  // dev only
  hideFromDevtools?: boolean;
  retryConfig?: RetryConfig<TData, TArgs, TError>;
  storeInContext?: boolean;
};

export type RetryConfig<TData, TArgs extends unknown[], TError> = {
  enabled: boolean;
  maxAttempts?: number;
  backoff?: number | ((attemptIndex: number, error: TError) => number);
  retry?: boolean | ((attemptIndex: number, error: TError) => boolean);
};

export type StateFunctionUpdater<TData, TArgs extends unknown[], TError> = (
  updater: State<TData, TArgs, TError>
) => TData;

export type CreateSourceObject<TData, TArgs extends unknown[], TError> = {
  key: string;
  config?: ProducerConfig<TData, TArgs, TError>;
  producer?: Producer<TData, TArgs, TError> | null;
};

export interface Source<TData, TArgs extends unknown[], TError>
  extends BaseSource<TData, TArgs, TError> {
  run(...args: TArgs): AbortFn;

  runp(...args: TArgs): Promise<State<TData, TArgs, TError>>;

  runc(props: RUNCProps<TData, TArgs, TError>): AbortFn;

  hasLane(laneKey: string): boolean;

  removeLane(laneKey?: string): boolean;

  getLane(laneKey?: string): Source<TData, TArgs, TError>;

  getAllLanes(): Source<TData, TArgs, TError>[];
}

export type RunTask<TData, TArgs extends unknown[], TError> = {
  args: TArgs;
  payload: Record<string, unknown>;
};
export type StateSubscription<TData, TArgs extends unknown[], TError> = {
  cleanup: () => void;
  props: AsyncStateSubscribeProps<TData, TArgs, TError>;
};
export type OnCacheLoadProps<TData, TArgs extends unknown[], TError> = {
  cache: Record<string, CachedState<TData, TArgs, TError>>;
  source: Source<TData, TArgs, TError>;
};
export type CacheConfig<TData, TArgs extends unknown[], TError> = {
  enabled: boolean;
  timeout?: ((currentState: State<TData, TArgs, TError>) => number) | number;
  hash?(
    args: TArgs | undefined,
    payload: Record<string, unknown> | null | undefined
  ): string;
  auto?: boolean;

  persist?(cache: Record<string, CachedState<TData, TArgs, TError>>): void;
  load?():
    | Record<string, CachedState<TData, TArgs, TError>>
    | Promise<Record<string, CachedState<TData, TArgs, TError>>>;

  onCacheLoad?({ cache, source }: OnCacheLoadProps<TData, TArgs, TError>): void;
};

export type CachedState<TData, TArgs extends unknown[], TError> = {
  state: State<TData, TArgs, TError>;
  addedAt: number;
  deadline: number;

  // when auto refresh is enabled, we store it in this id
  id?: ReturnType<typeof setTimeout>;
};

export type PendingTimeout = {
  id: ReturnType<typeof setTimeout>;
  at: number;
};

export type PendingUpdate = {
  id: ReturnType<typeof setTimeout>;
  callback(): void;
};

export type SetStateUpdateQueue<TData, TArgs extends unknown[], TError> = {
  id?: ReturnType<typeof setTimeout>;
  kind: 0; // instance.replaceState()
  data: State<TData, TArgs, TError>;
  next: UpdateQueue<TData, TArgs, TError> | null;
  callbacks?: ProducerCallbacks<TData, TArgs, TError>;
};

export type SetDataUpdateQueue<TData, TArgs extends unknown[], TError> = {
  id?: ReturnType<typeof setTimeout>;
  kind: 2; // instance.setData()
  data: TData | ((prev: TData | null) => TData);

  next: UpdateQueue<TData, TArgs, TError> | null;
};

export type ReplaceStateUpdateQueue<TData, TArgs extends unknown[], TError> = {
  id?: ReturnType<typeof setTimeout>;
  kind: 1; // instance.setState()
  data: {
    status?: Status;
    data: TData | StateFunctionUpdater<TData, TArgs, TError>;
  };
  next: UpdateQueue<TData, TArgs, TError> | null;
  callbacks?: ProducerCallbacks<TData, TArgs, TError>;
};

export type UpdateQueue<TData, TArgs extends unknown[], TError> =
  | ReplaceStateUpdateQueue<TData, TArgs, TError>
  | SetStateUpdateQueue<TData, TArgs, TError>
  | SetDataUpdateQueue<TData, TArgs, TError>;

export type OnSettled<TData, TArgs extends unknown[], TError> = {
  (
    data: TData,
    status: "success",
    savedProps: ProducerSavedProps<TData, TArgs>,
    callbacks?: ProducerCallbacks<TData, TArgs, TError>
  ): void;
  (
    data: TError,
    status: "error",
    savedProps: ProducerSavedProps<TData, TArgs>,
    callbacks?: ProducerCallbacks<TData, TArgs, TError>
  ): void;
};

export type LibraryContext = {
  ctx: any;
  name?: string;
  terminate(): void;

  // can be used by consumers
  payload: Record<string, any>;

  remove(key: string): boolean;
  getAll(): StateInterface<any, any, any>[];
  get(key: string): StateInterface<any, any, any> | undefined;
  set(key: string, inst: StateInterface<any, any, any>): void;
};
