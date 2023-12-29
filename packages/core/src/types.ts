import { RunEffect, Status } from "./enums";

export interface BaseSource<TData, A extends unknown[], E> {
  // identity
  key: string;
  uniqueId: number;
  readonly inst: StateInterface<TData, A, E>;

  getVersion(): number;

  getPayload(): Record<string, unknown>;

  mergePayload(partialPayload?: Record<string, unknown>): void;

  // state
  getState(): State<TData, A, E>;

  // todo: overload this!!!!
  setState(
    updater: StateFunctionUpdater<TData, A, E> | TData,
    status?: Status,
    callbacks?: ProducerCallbacks<TData, A, E>
  ): void;

  setData(newData: TData | ((prevData: TData | null) => TData)): void;

  replaceState(
    newState: State<TData, A, E>,
    notify?: boolean,
    callbacks?: ProducerCallbacks<TData, A, E>
  ): void;

  // subscriptions
  subscribe(cb: (s: State<TData, A, E>) => void): AbortFn;

  subscribe(subProps: AsyncStateSubscribeProps<TData, A, E>): AbortFn;

  subscribe(
    argv: ((s: State<TData, A, E>) => void) | AsyncStateSubscribeProps<TData, A, E>
  ): AbortFn;

  // producer
  replay(): AbortFn;

  abort(reason?: any): void;

  replaceProducer(newProducer: Producer<TData, A, E> | null): void;

  // cache
  invalidateCache(cacheKey?: string): void;

  replaceCache(cacheKey: string, cache: CachedState<TData, A, E>): void;

  patchConfig(partialConfig?: Partial<ProducerConfig<TData, A, E>>): void;

  getConfig(): ProducerConfig<TData, A, E>;

  on(
    eventType: InstanceChangeEvent,
    eventHandler: InstanceChangeEventHandlerType<TData, A, E>
  ): () => void;

  on(
    eventType: InstanceDisposeEvent,
    eventHandler: InstanceDisposeEventHandlerType<TData, A, E>
  ): () => void;

  on(
    eventType: InstanceCacheChangeEvent,
    eventHandler: InstanceCacheChangeEventHandlerType<TData, A, E>
  ): () => void;

  dispose(): boolean;
}

export type InstanceEventHandlerType<TData, A extends unknown[], E> =
  | InstanceChangeEventHandlerType<TData, A, E>
  | InstanceDisposeEventHandlerType<TData, A, E>
  | InstanceCacheChangeEventHandlerType<TData, A, E>;
export type StateChangeEventHandler<TData, A extends unknown[], E> =
  | ((newState: State<TData, A, E>) => void)
  | InstanceChangeEventObject<TData, A, E>;
export type InstanceChangeEventObject<TData, A extends unknown[], E> = {
  status: Status;
  handler: (newState: State<TData, A, E>) => void;
};
export type InstanceChangeEventHandlerType<TData, A extends unknown[], E> =
  | StateChangeEventHandler<TData, A, E>
  | StateChangeEventHandler<TData, A, E>[];
export type InstanceDisposeEventHandlerType<TData, A extends unknown[], E> =
  | (() => void)
  | (() => void)[];
export type InstanceCacheChangeEventHandlerType<TData, A extends unknown[], E> =
  | ((cache: Record<string, CachedState<TData, A, E>> | null | undefined) => void)
  | ((
      cache: Record<string, CachedState<TData, A, E>> | null | undefined
    ) => void)[];
export type InstanceChangeEvent = "change";
export type InstanceDisposeEvent = "dispose";
export type InstanceCacheChangeEvent = "cache-change";
export type InstanceEventType =
  | InstanceChangeEvent
  | InstanceDisposeEvent
  | InstanceCacheChangeEvent;
export type AsyncStateSubscribeProps<TData, A extends unknown[], E> = {
  key?: string;
  flags?: number;
  cb(s: State<TData, A, E>): void;
};
export type InstanceEvents<TData, A extends unknown[], E> = {
  change?: Record<number, InstanceChangeEventHandlerType<TData, A, E>>;
  dispose?: Record<number, InstanceDisposeEventHandlerType<TData, A, E>>;
  ["cache-change"]?: Record<
    number,
    InstanceCacheChangeEventHandlerType<TData, A, E>
  >;
};

export type HydrationData<TData, A extends unknown[], E> = {
  state: State<TData, A, E>;
  payload: Record<string, unknown>;
  latestRun: RunTask<TData, A, E> | null;
};

export interface StateInterface<TData, A extends unknown[], E> {
  // identity
  key: string;
  version: number;
  id: number;
  actions: Source<TData, A, E>;
  config: ProducerConfig<TData, A, E>;
  payload: Record<string, any> | null;

  // state
  state: State<TData, A, E>;
  lastSuccess: LastSuccessSavedState<TData, A>;

  pendingUpdate: PendingUpdate | null;
  pendingTimeout: PendingTimeout | null;

  queue: UpdateQueue<TData, A, E> | null;

  // subscriptions
  subsIndex: number | null;
  subscriptions: Record<number, StateSubscription<TData, A, E>> | null;

  // producer
  promise: Promise<TData> | null;
  fn: Producer<TData, A, E> | null;
  readonly ctx: LibraryContext | null;

  latestRun: RunTask<TData, A, E> | null;
  currentAbort: AbortFn | null;

  // lanes and forks
  parent: StateInterface<TData, A, E> | null;
  lanes: Record<string, StateInterface<TData, A, E>> | null;

  // cache
  cache: Record<string, CachedState<TData, A, E>> | null;

  events: InstanceEvents<TData, A, E> | null;
  eventsIndex: number | null;
  // dev properties
  journal?: any[]; // for devtools, dev only
}

export interface RUNCProps<TData, A extends unknown[], E>
  extends ProducerCallbacks<TData, A, E> {
  args?: A;
}

export type LastSuccessSavedState<TData, A extends unknown[]> =
  | InitialState<TData, A>
  | SuccessState<TData, A>;

export interface BaseState<TData, A extends unknown[]> {
  data: TData;
  status: Status;
  timestamp: number;
  props: ProducerSavedProps<TData, A>;
}

export type SuccessState<TData, A extends unknown[]> = {
  data: TData;
  timestamp: number;
  status: "success";
  props: ProducerSavedProps<TData, A>;
};
export type ErrorState<TData, A extends unknown[], E> = {
  data: E;
  timestamp: number;
  status: "error";
  props: ProducerSavedProps<TData, A>;
};
export type PendingState<TData, A extends unknown[], E> = {
  data: null;
  timestamp: number;
  status: "pending";
  props: ProducerSavedProps<TData, A>;

  prev: PendingPreviousState<TData, A, E>;
};

export type PendingPreviousState<TData, A extends unknown[], E> =
  | InitialState<TData, A>
  | SuccessState<TData, A>
  | ErrorState<TData, A, E>;

export type InitialState<TData, A extends unknown[]> = {
  timestamp: number;
  data: TData | undefined;
  status: "initial";
  props: ProducerSavedProps<TData, A>;
};

export type State<TData, A extends unknown[], E> =
  | InitialState<TData, A>
  | PendingState<TData, A, E>
  | SuccessState<TData, A>
  | ErrorState<TData, A, E>;
export type AbortFn = ((reason?: any) => void) | undefined;
export type OnAbortFn<R = unknown> = (cb?: (reason?: R) => void) => void;

export interface ProducerProps<TData, A extends unknown[] = [], E = Error> {
  onAbort: OnAbortFn;
  isAborted: () => boolean;
  abort: (reason?: any) => void;

  args: A;
  signal: AbortSignal;
  payload: Record<string, unknown>;
  lastSuccess: LastSuccessSavedState<TData, A>;

  emit: StateUpdater<TData, A, E>;
  getState: () => State<TData, A, E>;
}

export type RunIndicators = {
  index: number;
  done: boolean;
  cleared: boolean;
  aborted: boolean;
};

export type ProducerCallbacks<TData, A extends unknown[], E> = {
  onError?(errorState: ErrorState<TData, A, E>): void;
  onSuccess?(successState: SuccessState<TData, A>): void;
};

export type ProducerSavedProps<TData, A extends unknown[]> = {
  args: A;
  payload: Record<string, unknown> | null;
};

export type Producer<TData, TArgs extends unknown[] = [], TError = Error> = (
  props: ProducerProps<TData, TArgs, TError>
) => TData | Promise<TData> | Generator<any, TData, any>;

export type ProducerFunction<TData, A extends unknown[], E> = (
  props: ProducerProps<TData, A, E>,
  runIndicators: RunIndicators,
  callbacks?: ProducerCallbacks<TData, A, E>
) => AbortFn;

export type ProducerConfig<TData, A extends unknown[], E> = {
  skipPendingStatus?: boolean;
  initialValue?:
    | TData
    | ((cache: Record<string, CachedState<TData, A, E>> | null) => TData);
  cacheConfig?: CacheConfig<TData, A, E>;
  runEffectDurationMs?: number;
  runEffect?: RunEffect;
  keepPendingForMs?: number;
  skipPendingDelayMs?: number;
  resetStateOnDispose?: boolean;
  context?: unknown;

  // dev only
  hideFromDevtools?: boolean;
  retryConfig?: RetryConfig<TData, A, E>;
  storeInContext?: boolean;
};

export type RetryConfig<TData, A extends unknown[], E> = {
  enabled: boolean;
  maxAttempts?: number;
  backoff?: number | ((attemptIndex: number, error: E) => number);
  retry?: boolean | ((attemptIndex: number, error: E) => boolean);
};

export type StateFunctionUpdater<TData, A extends unknown[], E> = (
  updater: State<TData, A, E>
) => TData;

export type StateUpdater<TData, A extends unknown[], E> = (
  updater: StateFunctionUpdater<TData, A, E> | TData,
  status?: Status,
  callbacks?: ProducerCallbacks<TData, A, E>
) => void;

export type CreateSourceObject<TData, A extends unknown[], E> = {
  key: string;
  config?: ProducerConfig<TData, A, E>;
  producer?: Producer<TData, A, E> | null;
};

export interface Source<TData, A extends unknown[], E> extends BaseSource<TData, A, E> {
  run(...args: A): AbortFn;

  runp(...args: A): Promise<State<TData, A, E>>;

  runc(props: RUNCProps<TData, A, E>): AbortFn;

  hasLane(laneKey: string): boolean;

  removeLane(laneKey?: string): boolean;

  getLane(laneKey?: string): Source<TData, A, E>;

  getAllLanes(): Source<TData, A, E>[];
}

export type RunTask<TData, A extends unknown[], E> = {
  args: A;
  payload: Record<string, unknown>;
};
export type StateSubscription<TData, A extends unknown[], E> = {
  cleanup: () => void;
  props: AsyncStateSubscribeProps<TData, A, E>;
};
export type OnCacheLoadProps<TData, A extends unknown[], E> = {
  cache: Record<string, CachedState<TData, A, E>>;
  source: Source<TData, A, E>;
};
export type CacheConfig<TData, A extends unknown[], E> = {
  enabled: boolean;
  timeout?: ((currentState: State<TData, A, E>) => number) | number;
  hash?(
    args: A | undefined,
    payload: Record<string, unknown> | null | undefined
  ): string;
  auto?: boolean;

  persist?(cache: Record<string, CachedState<TData, A, E>>): void;
  load?():
    | Record<string, CachedState<TData, A, E>>
    | Promise<Record<string, CachedState<TData, A, E>>>;

  onCacheLoad?({ cache, source }: OnCacheLoadProps<TData, A, E>): void;
};

export type CachedState<TData, A extends unknown[], E> = {
  state: State<TData, A, E>;
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

export type SetStateUpdateQueue<TData, A extends unknown[], E> = {
  id?: ReturnType<typeof setTimeout>;
  kind: 0; // instance.setState()
  data: State<TData, A, E>;
  next: UpdateQueue<TData, A, E> | null;
  callbacks?: ProducerCallbacks<TData, A, E>;
};

export type SetDataUpdateQueue<TData, A extends unknown[], E> = {
  id?: ReturnType<typeof setTimeout>;
  kind: 2; // instance.setData()
  data: TData | ((prev: TData | null) => TData);

  next: UpdateQueue<TData, A, E> | null;
};

export type ReplaceStateUpdateQueue<TData, A extends unknown[], E> = {
  id?: ReturnType<typeof setTimeout>;
  kind: 1; // instance.replaceState()
  data: {
    status?: Status;
    data: TData | StateFunctionUpdater<TData, A, E>;
  };
  next: UpdateQueue<TData, A, E> | null;
  callbacks?: ProducerCallbacks<TData, A, E>;
};

export type UpdateQueue<TData, A extends unknown[], E> =
  | ReplaceStateUpdateQueue<TData, A, E>
  | SetStateUpdateQueue<TData, A, E>
  | SetDataUpdateQueue<TData, A, E>;

export type OnSettled<TData, A extends unknown[], E> = {
  (
    data: TData,
    status: "success",
    savedProps: ProducerSavedProps<TData, A>,
    callbacks?: ProducerCallbacks<TData, A, E>
  ): void;
  (
    data: E,
    status: "error",
    savedProps: ProducerSavedProps<TData, A>,
    callbacks?: ProducerCallbacks<TData, A, E>
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
