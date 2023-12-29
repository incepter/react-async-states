import { RunEffect, Status } from "./enums";

export interface BaseSource<TData, TArgs extends unknown[], E> {
  // identity
  key: string;
  uniqueId: number;
  readonly inst: StateInterface<TData, TArgs, E>;

  getVersion(): number;

  getPayload(): Record<string, unknown>;

  mergePayload(partialPayload?: Record<string, unknown>): void;

  // state
  getState(): State<TData, TArgs, E>;

  // todo: overload this!!!!
  setState(
    updater: StateFunctionUpdater<TData, TArgs, E> | TData,
    status?: Status,
    callbacks?: ProducerCallbacks<TData, TArgs, E>
  ): void;

  setData(newData: TData | ((prevData: TData | null) => TData)): void;

  replaceState(
    newState: State<TData, TArgs, E>,
    notify?: boolean,
    callbacks?: ProducerCallbacks<TData, TArgs, E>
  ): void;

  // subscriptions
  subscribe(cb: (s: State<TData, TArgs, E>) => void): AbortFn;

  subscribe(subProps: AsyncStateSubscribeProps<TData, TArgs, E>): AbortFn;

  subscribe(
    argv: ((s: State<TData, TArgs, E>) => void) | AsyncStateSubscribeProps<TData, TArgs, E>
  ): AbortFn;

  // producer
  replay(): AbortFn;

  abort(reason?: any): void;

  replaceProducer(newProducer: Producer<TData, TArgs, E> | null): void;

  // cache
  invalidateCache(cacheKey?: string): void;

  replaceCache(cacheKey: string, cache: CachedState<TData, TArgs, E>): void;

  patchConfig(partialConfig?: Partial<ProducerConfig<TData, TArgs, E>>): void;

  getConfig(): ProducerConfig<TData, TArgs, E>;

  on(
    eventType: InstanceChangeEvent,
    eventHandler: InstanceChangeEventHandlerType<TData, TArgs, E>
  ): () => void;

  on(
    eventType: InstanceDisposeEvent,
    eventHandler: InstanceDisposeEventHandlerType<TData, TArgs, E>
  ): () => void;

  on(
    eventType: InstanceCacheChangeEvent,
    eventHandler: InstanceCacheChangeEventHandlerType<TData, TArgs, E>
  ): () => void;

  dispose(): boolean;
}

export type InstanceEventHandlerType<TData, TArgs extends unknown[], E> =
  | InstanceChangeEventHandlerType<TData, TArgs, E>
  | InstanceDisposeEventHandlerType<TData, TArgs, E>
  | InstanceCacheChangeEventHandlerType<TData, TArgs, E>;
export type StateChangeEventHandler<TData, TArgs extends unknown[], E> =
  | ((newState: State<TData, TArgs, E>) => void)
  | InstanceChangeEventObject<TData, TArgs, E>;
export type InstanceChangeEventObject<TData, TArgs extends unknown[], E> = {
  status: Status;
  handler: (newState: State<TData, TArgs, E>) => void;
};
export type InstanceChangeEventHandlerType<TData, TArgs extends unknown[], E> =
  | StateChangeEventHandler<TData, TArgs, E>
  | StateChangeEventHandler<TData, TArgs, E>[];
export type InstanceDisposeEventHandlerType<TData, TArgs extends unknown[], E> =
  | (() => void)
  | (() => void)[];
export type InstanceCacheChangeEventHandlerType<TData, TArgs extends unknown[], E> =
  | ((cache: Record<string, CachedState<TData, TArgs, E>> | null | undefined) => void)
  | ((
      cache: Record<string, CachedState<TData, TArgs, E>> | null | undefined
    ) => void)[];
export type InstanceChangeEvent = "change";
export type InstanceDisposeEvent = "dispose";
export type InstanceCacheChangeEvent = "cache-change";
export type InstanceEventType =
  | InstanceChangeEvent
  | InstanceDisposeEvent
  | InstanceCacheChangeEvent;
export type AsyncStateSubscribeProps<TData, TArgs extends unknown[], E> = {
  key?: string;
  flags?: number;
  cb(s: State<TData, TArgs, E>): void;
};
export type InstanceEvents<TData, TArgs extends unknown[], E> = {
  change?: Record<number, InstanceChangeEventHandlerType<TData, TArgs, E>>;
  dispose?: Record<number, InstanceDisposeEventHandlerType<TData, TArgs, E>>;
  ["cache-change"]?: Record<
    number,
    InstanceCacheChangeEventHandlerType<TData, TArgs, E>
  >;
};

export type HydrationData<TData, TArgs extends unknown[], E> = {
  state: State<TData, TArgs, E>;
  payload: Record<string, unknown>;
  latestRun: RunTask<TData, TArgs, E> | null;
};

export interface StateInterface<TData, TArgs extends unknown[], E> {
  // identity
  key: string;
  version: number;
  id: number;
  actions: Source<TData, TArgs, E>;
  config: ProducerConfig<TData, TArgs, E>;
  payload: Record<string, any> | null;

  // state
  state: State<TData, TArgs, E>;
  lastSuccess: LastSuccessSavedState<TData, TArgs>;

  pendingUpdate: PendingUpdate | null;
  pendingTimeout: PendingTimeout | null;

  queue: UpdateQueue<TData, TArgs, E> | null;

  // subscriptions
  subsIndex: number | null;
  subscriptions: Record<number, StateSubscription<TData, TArgs, E>> | null;

  // producer
  promise: Promise<TData> | null;
  fn: Producer<TData, TArgs, E> | null;
  readonly ctx: LibraryContext | null;

  latestRun: RunTask<TData, TArgs, E> | null;
  currentAbort: AbortFn | null;

  // lanes and forks
  parent: StateInterface<TData, TArgs, E> | null;
  lanes: Record<string, StateInterface<TData, TArgs, E>> | null;

  // cache
  cache: Record<string, CachedState<TData, TArgs, E>> | null;

  events: InstanceEvents<TData, TArgs, E> | null;
  eventsIndex: number | null;
  // dev properties
  journal?: any[]; // for devtools, dev only
}

export interface RUNCProps<TData, TArgs extends unknown[], E>
  extends ProducerCallbacks<TData, TArgs, E> {
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
export type ErrorState<TData, TArgs extends unknown[], E> = {
  data: E;
  timestamp: number;
  status: "error";
  props: ProducerSavedProps<TData, TArgs>;
};
export type PendingState<TData, TArgs extends unknown[], E> = {
  data: null;
  timestamp: number;
  status: "pending";
  props: ProducerSavedProps<TData, TArgs>;

  prev: PendingPreviousState<TData, TArgs, E>;
};

export type PendingPreviousState<TData, TArgs extends unknown[], E> =
  | InitialState<TData, TArgs>
  | SuccessState<TData, TArgs>
  | ErrorState<TData, TArgs, E>;

export type InitialState<TData, TArgs extends unknown[]> = {
  timestamp: number;
  data: TData | undefined;
  status: "initial";
  props: ProducerSavedProps<TData, TArgs>;
};

export type State<TData, TArgs extends unknown[], E> =
  | InitialState<TData, TArgs>
  | PendingState<TData, TArgs, E>
  | SuccessState<TData, TArgs>
  | ErrorState<TData, TArgs, E>;
export type AbortFn = ((reason?: any) => void) | undefined;
export type OnAbortFn<R = unknown> = (cb?: (reason?: R) => void) => void;

export interface ProducerProps<TData, TArgs extends unknown[] = [], E = Error> {
  onAbort: OnAbortFn;
  isAborted: () => boolean;
  abort: (reason?: any) => void;

  args: TArgs;
  signal: AbortSignal;
  payload: Record<string, unknown>;
  lastSuccess: LastSuccessSavedState<TData, TArgs>;

  emit: StateUpdater<TData, TArgs, E>;
  getState: () => State<TData, TArgs, E>;
}

export type RunIndicators = {
  index: number;
  done: boolean;
  cleared: boolean;
  aborted: boolean;
};

export type ProducerCallbacks<TData, TArgs extends unknown[], E> = {
  onError?(errorState: ErrorState<TData, TArgs, E>): void;
  onSuccess?(successState: SuccessState<TData, TArgs>): void;
};

export type ProducerSavedProps<TData, TArgs extends unknown[]> = {
  args: TArgs;
  payload: Record<string, unknown> | null;
};

export type Producer<TData, TArgs extends unknown[] = [], TError = Error> = (
  props: ProducerProps<TData, TArgs, TError>
) => TData | Promise<TData> | Generator<any, TData, any>;

export type ProducerFunction<TData, TArgs extends unknown[], E> = (
  props: ProducerProps<TData, TArgs, E>,
  runIndicators: RunIndicators,
  callbacks?: ProducerCallbacks<TData, TArgs, E>
) => AbortFn;

export type ProducerConfig<TData, TArgs extends unknown[], E> = {
  skipPendingStatus?: boolean;
  initialValue?:
    | TData
    | ((cache: Record<string, CachedState<TData, TArgs, E>> | null) => TData);
  cacheConfig?: CacheConfig<TData, TArgs, E>;
  runEffectDurationMs?: number;
  runEffect?: RunEffect;
  keepPendingForMs?: number;
  skipPendingDelayMs?: number;
  resetStateOnDispose?: boolean;
  context?: unknown;

  // dev only
  hideFromDevtools?: boolean;
  retryConfig?: RetryConfig<TData, TArgs, E>;
  storeInContext?: boolean;
};

export type RetryConfig<TData, TArgs extends unknown[], E> = {
  enabled: boolean;
  maxAttempts?: number;
  backoff?: number | ((attemptIndex: number, error: E) => number);
  retry?: boolean | ((attemptIndex: number, error: E) => boolean);
};

export type StateFunctionUpdater<TData, TArgs extends unknown[], E> = (
  updater: State<TData, TArgs, E>
) => TData;

export type StateUpdater<TData, TArgs extends unknown[], E> = (
  updater: StateFunctionUpdater<TData, TArgs, E> | TData,
  status?: Status,
  callbacks?: ProducerCallbacks<TData, TArgs, E>
) => void;

export type CreateSourceObject<TData, TArgs extends unknown[], E> = {
  key: string;
  config?: ProducerConfig<TData, TArgs, E>;
  producer?: Producer<TData, TArgs, E> | null;
};

export interface Source<TData, TArgs extends unknown[], E> extends BaseSource<TData, TArgs, E> {
  run(...args: TArgs): AbortFn;

  runp(...args: TArgs): Promise<State<TData, TArgs, E>>;

  runc(props: RUNCProps<TData, TArgs, E>): AbortFn;

  hasLane(laneKey: string): boolean;

  removeLane(laneKey?: string): boolean;

  getLane(laneKey?: string): Source<TData, TArgs, E>;

  getAllLanes(): Source<TData, TArgs, E>[];
}

export type RunTask<TData, TArgs extends unknown[], E> = {
  args: TArgs;
  payload: Record<string, unknown>;
};
export type StateSubscription<TData, TArgs extends unknown[], E> = {
  cleanup: () => void;
  props: AsyncStateSubscribeProps<TData, TArgs, E>;
};
export type OnCacheLoadProps<TData, TArgs extends unknown[], E> = {
  cache: Record<string, CachedState<TData, TArgs, E>>;
  source: Source<TData, TArgs, E>;
};
export type CacheConfig<TData, TArgs extends unknown[], E> = {
  enabled: boolean;
  timeout?: ((currentState: State<TData, TArgs, E>) => number) | number;
  hash?(
    args: TArgs | undefined,
    payload: Record<string, unknown> | null | undefined
  ): string;
  auto?: boolean;

  persist?(cache: Record<string, CachedState<TData, TArgs, E>>): void;
  load?():
    | Record<string, CachedState<TData, TArgs, E>>
    | Promise<Record<string, CachedState<TData, TArgs, E>>>;

  onCacheLoad?({ cache, source }: OnCacheLoadProps<TData, TArgs, E>): void;
};

export type CachedState<TData, TArgs extends unknown[], E> = {
  state: State<TData, TArgs, E>;
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

export type SetStateUpdateQueue<TData, TArgs extends unknown[], E> = {
  id?: ReturnType<typeof setTimeout>;
  kind: 0; // instance.setState()
  data: State<TData, TArgs, E>;
  next: UpdateQueue<TData, TArgs, E> | null;
  callbacks?: ProducerCallbacks<TData, TArgs, E>;
};

export type SetDataUpdateQueue<TData, TArgs extends unknown[], E> = {
  id?: ReturnType<typeof setTimeout>;
  kind: 2; // instance.setData()
  data: TData | ((prev: TData | null) => TData);

  next: UpdateQueue<TData, TArgs, E> | null;
};

export type ReplaceStateUpdateQueue<TData, TArgs extends unknown[], E> = {
  id?: ReturnType<typeof setTimeout>;
  kind: 1; // instance.replaceState()
  data: {
    status?: Status;
    data: TData | StateFunctionUpdater<TData, TArgs, E>;
  };
  next: UpdateQueue<TData, TArgs, E> | null;
  callbacks?: ProducerCallbacks<TData, TArgs, E>;
};

export type UpdateQueue<TData, TArgs extends unknown[], E> =
  | ReplaceStateUpdateQueue<TData, TArgs, E>
  | SetStateUpdateQueue<TData, TArgs, E>
  | SetDataUpdateQueue<TData, TArgs, E>;

export type OnSettled<TData, TArgs extends unknown[], E> = {
  (
    data: TData,
    status: "success",
    savedProps: ProducerSavedProps<TData, TArgs>,
    callbacks?: ProducerCallbacks<TData, TArgs, E>
  ): void;
  (
    data: E,
    status: "error",
    savedProps: ProducerSavedProps<TData, TArgs>,
    callbacks?: ProducerCallbacks<TData, TArgs, E>
  ): void;
};

export type LibraryContext = {
  ctx: any;
  terminate(): void;
  version: { version: string; copyright: string };

  remove(key: string): boolean;
  getAll(): StateInterface<any, any, any>[];
  get(key: string): StateInterface<any, any, any> | undefined;
  set(key: string, inst: StateInterface<any, any, any>): void;
};
