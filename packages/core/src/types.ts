import {RunEffect, Status} from "./enums";

export type ProducerWrapperInput<T, E, R> = {
  setState: StateUpdater<T, E, R>,
  getState(): State<T, E, R>,
  instance?: StateInterface<T, E, R>,
  setSuspender(p: Promise<T>): void,
  replaceState(newState: State<T, E, R>, notify?: boolean),
  getProducer(): Producer<T, E, R> | undefined | null,
}

export interface BaseSource<T, E = any, R = any> {
  // identity
  key: string,
  uniqueId: number,

  getVersion(): number,

  getPayload(): Record<string, any>,

  mergePayload(partialPayload?: Record<string, any>),

  // state
  getState(): State<T, E, R>,

  // todo: overload this!!!!
  setState(updater: StateFunctionUpdater<T, E, R> | T, status?: Status,): void;

  // subscriptions
  subscribe(cb: (s: State<T, E, R>) => void): AbortFn

  subscribe(subProps: AsyncStateSubscribeProps<T, E, R>): AbortFn

  subscribe(argv: ((s: State<T, E, R>) => void) | AsyncStateSubscribeProps<T, E, R>): AbortFn

  // producer
  replay(): AbortFn,

  abort(reason?: any): void,

  replaceProducer(newProducer: Producer<T, E, R> | undefined),

  // cache
  invalidateCache(cacheKey?: string): void,

  replaceCache(cacheKey: string, cache: CachedState<T, E, R>): void,

  patchConfig(partialConfig?: Partial<ProducerConfig<T, E, R>>),

  getConfig(): ProducerConfig<T, E, R>,

  on(
    eventType: InstanceChangeEvent,
    eventHandler: InstanceChangeEventHandlerType<T, E, R>
  ): (() => void),

  on(
    eventType: InstanceDisposeEvent,
    eventHandler: InstanceDisposeEventHandlerType<T, E, R>
  ): (() => void),

  on(
    eventType: InstanceCacheChangeEvent,
    eventHandler: InstanceCacheChangeEventHandlerType<T, E, R>
  ): (() => void),

}

export type InstanceEventHandlerType<T, E, R> =
  InstanceChangeEventHandlerType<T, E, R>
  |
  InstanceDisposeEventHandlerType<T, E, R>
  |
  InstanceCacheChangeEventHandlerType<T, E, R>;
export type StateChangeEventHandler<T, E = any, R = any> =
  ((newState: State<T, E, R>) => void)
  |
  InstanceChangeEventObject<T, E, R>;
export type InstanceChangeEventObject<T, E = any, R = any> = {
  status: Status
  handler: ((newState: State<T, E, R>) => void),
}
export type InstanceChangeEventHandlerType<T, E, R> =
  StateChangeEventHandler<T, E, R>
  | StateChangeEventHandler<T, E, R>[];
export type InstanceDisposeEventHandlerType<T, E, R> =
  (() => void)
  | (() => void)[];
export type InstanceCacheChangeEventHandlerType<T, E, R> =
  ((cache: Record<string, CachedState<T, E, R>> | null | undefined) => void)
  | ((cache: Record<string, CachedState<T, E, R>> | null | undefined) => void)[];
export type InstanceChangeEvent = "change";
export type InstanceDisposeEvent = "dispose";
export type InstanceCacheChangeEvent = "cache-change";
export type InstanceEventType = InstanceChangeEvent |
  InstanceDisposeEvent |
  InstanceCacheChangeEvent;
export type AsyncStateSubscribeProps<T, E, R> = {
  key?: string,
  flags?: number,
  cb(s: State<T, E, R>): void,
}
export type InstanceEvents<T, E, R> = {
  change?: Record<number, InstanceChangeEventHandlerType<T, E, R>>,
  dispose?: Record<number, InstanceDisposeEventHandlerType<T, E, R>>,
  ['cache-change']?: Record<number, InstanceCacheChangeEventHandlerType<T, E, R>>,
}

export type HydrationData<T, E, R> = {
  state: State<T, E, R>,
  payload: Record<string, any>,
  latestRun?: RunTask<T, E, R> | null,
}

export interface StateInterface<T, E = any, R = any> extends BaseSource<T, E, R> {
  // identity
  version: number,
  _source: Source<T, E, R>,
  config: ProducerConfig<T, E, R>,
  payload?: Record<string, any> | null,

  // state
  state: State<T, E, R>,
  lastSuccess: SuccessState<T> | InitialState<T>,

  queue?: UpdateQueue<T, E, R>,
  flushing?: boolean,
  replaceState(newState: State<T, E, R>, notify?: boolean): void,

  // subscriptions
  subsIndex?: number;
  subscriptions?: Record<number, StateSubscription<T, E, R>> | null,

  // producer
  suspender?: Promise<T>,
  producer: ProducerFunction<T, E, R>,
  originalProducer: Producer<T, E, R> | undefined | null,
  pool: PoolInterface;

  request?: Request,

  isEmitting?: boolean;
  willUpdate?: boolean;

  latestRun?: RunTask<T, E, R> | null;
  currentAbort?: AbortFn;

  // lanes and forks
  forksIndex?: number,
  parent?: StateInterface<T, E, R> | null,
  lanes?: Record<string, StateInterface<T, E, R>> | null,

  // cache
  cache?: Record<string, CachedState<T, E, R>> | null,

  events?: InstanceEvents<T, E, R>;
  eventsIndex?: number,
  // dev properties
  journal?: any[], // for devtools, dev only

  // methods & overrides
  dispose(): boolean,

  hasLane(laneKey: string): boolean,

  getLane(laneKey?: string): StateInterface<T, E, R>,

  fork(forkConfig?: ForkConfig): StateInterface<T, E, R>,

  // lanes and forks
  removeLane(laneKey?: string): boolean,

  getLane(laneKey?: string): BaseSource<T, E, R>,

  fork(forkConfig?: ForkConfig): BaseSource<T, E, R>,

  run(
    ...args: any[]
  ): AbortFn,

  runp(
    ...args: any[]
  ): Promise<State<T, E, R>>,

  runc(
    props?: RUNCProps<T, E, R>
  ): AbortFn,

}

export interface RUNCProps<T, E, R> extends ProducerCallbacks<T, E, R> {
  args?: any[],
}

export type LastSuccessSavedState<T> = {
  data: T,
  timestamp: number,
  props?: ProducerSavedProps<T> | null,
  status: Status.success | Status.initial,
}

export interface BaseState<T> {
  data: T,
  status: Status,
  timestamp: number,
  props?: ProducerSavedProps<T> | null,
}

export type SuccessState<T> = {
  data: T,
  timestamp: number,
  status: Status.success,
  props: ProducerSavedProps<T>,
}
export type ErrorState<T, E = any> = {
  data: E,
  timestamp: number,
  status: Status.error,
  props: ProducerSavedProps<T>,
}
export type PendingState<T> = {
  data: null,
  timestamp: number,
  status: Status.pending,
  props: ProducerSavedProps<T>,
}
export type InitialState<T> = {
  props: null,
  timestamp: number,
  data: T | undefined,
  status: Status.initial,
}
export type AbortedState<T, E = any, R = any> = {
  data: R,
  timestamp: number,
  status: Status.aborted,
  props: ProducerSavedProps<T>,
}
export type State<T, E = any, R = any> = InitialState<T> |
  PendingState<T> |
  AbortedState<T, E, R> |
  SuccessState<T> |
  ErrorState<T, E>
export type AbortFn = ((reason?: any) => void) | undefined;
export type OnAbortFn = (cb?: ((reason?: any) => void)) => void;

export interface ProducerProps<T, E = any, R = any> extends ProducerEffects {
  abort: AbortFn,
  onAbort: OnAbortFn,
  emit: StateUpdater<T, E, R>,

  args: any[],
  payload: any,
  lastSuccess: SuccessState<T> | InitialState<T>,
  isAborted: () => boolean,

  getState: () => State<T, E, R>,
}

export type RunIndicators = {
  cleared: boolean,
  aborted: boolean,
  fulfilled: boolean,
}
export type ProducerCallbacks<T, E, R> = {
  onError?(errorState: ErrorState<T, E>),
  onSuccess?(successState: SuccessState<T>),
  onAborted?(aborted: AbortedState<T, E, R>),
}
export type ProducerSavedProps<T> = {
  args?: any[],
  payload?: Record<string, any> | null,
}
export type Producer<T, E = any, R = any> =
  ((props: ProducerProps<T, E, R>) => (T | Promise<T> | Generator<any, T, any>));
export type ProducerFunction<T, E = any, R = any> = (
  props: ProducerProps<T, E, R>,
  runIndicators: RunIndicators,
  callbacks?: ProducerCallbacks<T, E, R>,
) => AbortFn;
export type ProducerConfig<T, E = any, R = any> = {
  skipPendingStatus?: boolean,
  initialValue?: T | ((cache: Record<string, CachedState<T, E, R>>) => T),
  cacheConfig?: CacheConfig<T, E, R>,
  runEffectDurationMs?: number,
  runEffect?: RunEffect,
  keepPendingForMs?: number,
  skipPendingDelayMs?: number,
  resetStateOnDispose?: boolean,
  context?: any,

  pool?: string,

  // dev only
  hideFromDevtools?: boolean,
}
export type StateFunctionUpdater<T, E = any, R = any> = (updater: State<T, E, R>) => T;
export type StateUpdater<T, E = any, R = any> = (
  updater: T | StateFunctionUpdater<T, E, R>,
  status?: Status
) => void;

export type CreateSourceObject<T, E, R> = {
  key: string,
  config?: ProducerConfig<T, E, R>,
  producer?: Producer<T, E, R> | null,
}

export type CreateSourceType = {
  <T, E = any, R = any>(props: CreateSourceObject<T, E, R>): Source<T, E, R>,
  <T, E = any, R = any>(
    key: string,
    producer?: Producer<T, E, R> | undefined | null,
    config?: ProducerConfig<T, E, R>,
  ): Source<T, E, R>,
  <T, E = any, R = any>(
    props: string | CreateSourceObject<T, E, R>,
    maybeProducer?: Producer<T, E, R> | undefined | null,
    maybeConfig?: ProducerConfig<T, E, R>,
  ): Source<T, E, R>,
}

export type SourcesType = {
  <T, E = any, R = any>(): Source<T, E, R>,
  for: CreateSourceType,
  of<T, E = any, R = any>(key: string, pool?: string),
}

export interface Source<T, E = any, R = any> extends BaseSource<T, E, R> {
  run(...args: any[]): AbortFn,

  runp(...args: any[]): Promise<State<T, E, R>>,

  runc(props: RUNCProps<T, E, R>): AbortFn,

  hasLane(laneKey: string): boolean,

  removeLane(laneKey?: string): boolean,

  getLaneSource(laneKey?: string): Source<T, E, R>,

  getAllLanes(): Source<T, E, R>[],
}

export type RunTask<T, E, R> = {
  args: any[],
  payload: Record<string, any> | null,
}
export type StateSubscription<T, E, R> = {
  cleanup: () => void,
  props: AsyncStateSubscribeProps<T, E, R>
};
export type OnCacheLoadProps<T, E = any, R = any> = {
  cache: Record<string, CachedState<T, E, R>>,
  setState(
    newValue: T | StateFunctionUpdater<T, E, R>, status?: Status): void
}
export type CacheConfig<T, E = any, R = any> = {
  enabled: boolean,
  getDeadline?(currentState: State<T, E, R>): number,
  hash?(args: any[] | undefined, payload: Record<string, any> | null | undefined): string,

  persist?(cache: Record<string, CachedState<T, E, R>>): void,
  load?(): Record<string, CachedState<T, E, R>> | Promise<Record<string, CachedState<T, E, R>>>,

  onCacheLoad?({cache, setState}: OnCacheLoadProps<T, E, R>): void,
}
export type CachedState<T, E = any, R = any> = {
  state: State<T, E, R>,
  addedAt: number,
  deadline: number,
}

export interface StateBuilderInterface {
  initial: <T> (initialValue: T) => InitialState<T>,
  pending: <T>(props: ProducerSavedProps<T>) => PendingState<T>,
  success: <T>(data: T, props: ProducerSavedProps<T> | null) => SuccessState<T>,
  error: <T, E>(data: any, props: ProducerSavedProps<T>) => ErrorState<T, E>,
  aborted: <T, E, R>(
    reason: any, props: ProducerSavedProps<T>) => AbortedState<T, E, R>,
}

export type ForkConfig = {
  key?: string,
  keepState?: boolean,
  keepCache?: boolean,
}
export type AsyncStateKeyOrSource<T, E = any, R = any> =
  string
  | Source<T, E, R>;

export interface ProducerEffects {
  run: <T, E, R>(
    input: ProducerRunInput<T, E, R>, config: ProducerRunConfig | null,
    ...args: any[]
  ) => AbortFn,

  runp: <T, E, R>(
    input: ProducerRunInput<T, E, R>, config: ProducerRunConfig | null,
    ...args: any[]
  ) => Promise<State<T, E, R>> | undefined,

  select: <T, E, R>(
    input: AsyncStateKeyOrSource<T, E, R>,
    lane?: string
  ) => State<T, E, R> | undefined,
}

export type ProducerRunInput<T, E = any, R = any> =
  AsyncStateKeyOrSource<T, E, R>
  | Producer<T, E, R>;
export type ProducerRunConfig = {
  lane?: string,
  fork?: boolean,
  payload?: Record<string, any> | null,
  pool?: string,
};
export type PendingTimeout = { id: ReturnType<typeof setTimeout>, startDate: number };
export type PendingUpdate = { timeoutId: ReturnType<typeof setTimeout>, callback(): void };
export type AsyncStatePools = Record<string, PoolInterface>;
export type WatchCallback<T, E = any, R = any> = (
  value: StateInterface<T, E, R> | null, key: string) => void;

export interface PoolInterface {
  name: string,
  simpleName: string,
  version: string,

  mergePayload(payload: Record<string, any>): void,

  instances: Map<string, StateInterface<any>>,

  watch<T, E, R>(key: string, value: WatchCallback<T, E, R>): AbortFn,

  listen(cb: WatchCallback<any>): AbortFn,

  set(key: string, instance: StateInterface<any>),

  context: LibraryPoolsContext,
}

export type LibraryPoolsContext = {
  context: any,
  pools: AsyncStatePools,
  poolInUse: PoolInterface,
  enableDiscovery(name?: string): void,
  setDefaultPool(name: string): Promise<void>,
  getOrCreatePool(name?: string): PoolInterface,
}


export type SetStateUpdateQueue<T, E, R> = {
  id?: ReturnType<typeof setTimeout>
  kind: 0,
  data: State<T, E, R>,
  next: UpdateQueue<T, E, R> | null
}

export type ReplaceStateUpdateQueue<T, E, R> = {
  id?: ReturnType<typeof setTimeout>
  kind: 1,
  data: {
    status?: Status,
    data: T | StateFunctionUpdater<T, E, R>,
  },
  next: UpdateQueue<T, E, R> | null
}

export type UpdateQueue<T, E, R> =
  ReplaceStateUpdateQueue<T, E, R>
  | SetStateUpdateQueue<T, E, R>
