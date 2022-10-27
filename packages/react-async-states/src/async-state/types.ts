import {AsyncStateKeyOrSource} from "../types.internal";

export enum AsyncStateStatus {
  error = "error",
  pending = "pending",
  success = "success",
  aborted = "aborted",
  initial = "initial",
}

export enum ProducerRunEffects {
  delay = "delay",
  debounce = "debounce",
  takeLast = "takeLast",
  takeLatest = "takeLatest",

  throttle = "throttle",
  takeFirst = "takeFirst",
  takeLeading = "takeLeading",
}

export type State<T> = {
  data: T,
  timestamp: number,
  status: AsyncStateStatus,
  props?: ProducerSavedProps<T> | null,
};

export type AbortFn = ((reason?: any) => void) | undefined;

export type OnAbortFn = (cb: ((reason?: any) => void)) => void;

export interface ProducerProps<T> extends ProducerEffects {
  abort: AbortFn,
  onAbort: OnAbortFn,
  emit: StateUpdater<T>,

  args: any[],
  payload: any,
  lastSuccess: State<T>,
  isAborted: () => boolean,

  getState: () => State<T>,
}

export type RunIndicators = {
  cleared: boolean,
  aborted: boolean,
  fulfilled: boolean,
}

export type ProducerSavedProps<T> = {
  payload?: any,
  args?: any[],
  lastSuccess?: State<T>
}

export type Producer<T> =
  ((props: ProducerProps<T>) => (T | Promise<T> | Generator<any, T, any>));

export type ProducerFunction<T> = (
  props: ProducerProps<T>,
  runIndicators: RunIndicators
) => AbortFn;

export enum ProducerType {
  indeterminate = 0,
  sync = 1,
  promise = 2,
  generator = 3,
  notProvided = 4,
}

export enum RenderStrategy {
  FetchAsYouRender = 0,
  FetchThenRender = 1,
  RenderThenFetch = 2,
}

export type ProducerConfig<T> = {
  initialValue?: T | ((cache: Record<string, CachedState<T>>) => T),
  cacheConfig?: CacheConfig<T>,
  runEffectDurationMs?: number,
  runEffect?: ProducerRunEffects,
  skipPendingDelayMs?: number,
  resetStateOnDispose?: boolean,
}

export type StateFunctionUpdater<T> = (updater: State<T>) => T;

export type StateUpdater<T> = (
  updater: T | StateFunctionUpdater<T>,
  status?: AsyncStateStatus
) => void;

export type Source<T> = {
  key: string,
  uniqueId: number | undefined,

  getState(): State<T>,
  setState: StateUpdater<T>,
  run: (...args: any[]) => AbortFn,
  getLaneSource(laneKey?: string): Source<T>,
  invalidateCache: (cacheKey?: string) => void,
  subscribe: (cb: Function, subscriptionKey?: string) => AbortFn,
}
export type RunTask<T> = {
  args: any[],
  payload: Record<string, any> | null,
  producerEffectsCreator: ProducerEffectsCreator<T>,
}

export type StateSubscription<T> = {
  key: string, // subscription key
  cleanup: () => void,
  callback: (newState: State<T>) => void,
};

export type OnCacheLoadProps<T> = {
  cache: Record<string, CachedState<T>>,
  setState(newValue: T | StateFunctionUpdater<T>, status?: AsyncStateStatus): void
}

export type CacheConfig<T> = {
  enabled: boolean,
  getDeadline?(currentState: State<T>): number,
  hash?(args: any[] | undefined, payload: Record<string, any> | null): string,

  persist?(cache: Record<string, CachedState<T>>): void,
  load?(): Record<string, CachedState<T>> | Promise<Record<string, CachedState<T>>>,

  onCacheLoad?({cache, setState}: OnCacheLoadProps<T>): void,
}

export type CachedState<T> = {
  state: State<T>,
  addedAt: number,
  deadline: number,
}

export interface StateInterface<T> {
  // identity
  key: string,
  version: number,
  uniqueId: number,
  _source: Source<T>,
  config: ProducerConfig<T>,
  payload: Record<string, any> | null,
  mergePayload(partialPayload: Record<string, any>),

  // state
  state: State<T>,
  getState(): State<T>,
  lastSuccess: State<T>,
  replaceState: StateUpdater<T>,
  setState(newState: State<T>, notify?: boolean): void,

  // subscriptions
  dispose(): boolean,
  subscriptions: Record<number, StateSubscription<T>> | null,
  subscribe(cb: Function, subscriptionKey?: string): AbortFn,

  // producer
  producerType: ProducerType,
  producer: ProducerFunction<T>,
  suspender: Promise<T> | undefined,
  originalProducer: Producer<T> | undefined,

  replay(): AbortFn,
  abort(reason: any): void,
  replaceProducer(newProducer: Producer<any>),
  run(createProducerEffects: ProducerEffectsCreator<T>, ...args: any[]): AbortFn,


  // lanes and forks
  parent: StateInterface<T> | null,
  getLane(laneKey?: string): StateInterface<T>,
  lanes: Record<string, StateInterface<T>> | null,
  fork(forkConfig?: ForkConfig): StateInterface<T>,

  // cache
  invalidateCache(cacheKey?: string): void,
  cache: Record<string, CachedState<T>> | null,
  replaceCache(cacheKey: string, cache: CachedState<T>): void,


  // dev properties
  journal: any[], // for devtools, dev only
}

export interface StateBuilderInterface {
  initial: <T> (initialValue: T) => State<T>,
  pending: <T>(props: ProducerSavedProps<T>) => State<T>,
  success: <T>(data: T, props: ProducerSavedProps<T>) => State<T>,
  error: <T>(data: any, props: ProducerSavedProps<T>) => State<any>,
  aborted: <T>(reason: any, props: ProducerSavedProps<T>) => State<any>,
}

export type ForkConfig = {
  key?: string,
  keepState?: boolean,
  keepCache?: boolean,
}

export interface ProducerEffects {
  run: <T>(input: ProducerPropsRunInput<T>, config: ProducerPropsRunConfig | null, ...args: any[] ) => AbortFn,
  runp: <T>(input: ProducerPropsRunInput<T>, config: ProducerPropsRunConfig | null, ...args: any[] ) => Promise<State<T>> | undefined,

  select: <T>(input: AsyncStateKeyOrSource<T>) => State<T> | undefined,
}

export type ProducerEffectsCreator<T> = (props: ProducerProps<T>) => ProducerEffects;

export type ProducerPropsRunInput<T> = AsyncStateKeyOrSource<T> | Producer<T>;

export type ProducerPropsRunConfig = {
  lane?: string,
  fork?: boolean,
  payload?: Record<string, any> | null,
};

export type PendingTimeout = { id: ReturnType<typeof setTimeout>, startDate: number };
export type PendingUpdate = { timeoutId: ReturnType<typeof setTimeout>, callback(): void };
