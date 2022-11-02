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

export interface Source<T> extends BaseSource<T>{
  run: (...args: any[]) => AbortFn,

  removeLane(laneKey?: string): boolean,
  getLaneSource(laneKey?: string): Source<T>,
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

export type DevModeConfiguration = {
  creationPath: CreationPath,
}

export enum CreationPath {
  CREATE_SOURCE                           = 0b00001,
  USE_ASYNC_STATE                         = 0b00010,
  PROPS_RUN_FUNCTION                      = 0b00100,
  PROPS_RUNP_FUNCTION                     = 0b01000,
  PROVIDER_INITIALIZATION                 = 0b10000,
}

/**
 * getState
 * setState
 * replaceProducer
 * getConfig
 * setConfig
 *
 * invalidateCache
 * replaceCache
 *
 * getPayload
 * mergePayload
 *
 * getLane
 * removeLane
 *
 * subscribe
 *
 * run
 * replay
 * abort
 * runp
 *
 *
 * constructor(key, producer, config) {
 *   super();
 *   this.boot(key, producer, config);
 * }
 *
 */

export interface BaseSource<T> {
  // identity
  key: string,
  uniqueId: number,
  getPayload(): Record<string, any>,
  mergePayload(partialPayload?: Record<string, any>),

  // state
  getState(): State<T>,
  setState(
    updater: StateFunctionUpdater<T> | T, status?: AsyncStateStatus): void;


  // subscriptions
  subscribe(cb: Function, subscriptionKey?: string): AbortFn,

  // producer
  replay(): AbortFn,
  abort(reason: any): void,
  replaceProducer(newProducer: Producer<any> | undefined),
  run(createProducerEffects: ProducerEffectsCreator<T>, ...args: any[]): AbortFn,

  // cache
  invalidateCache(cacheKey?: string): void,
  replaceCache(cacheKey: string, cache: CachedState<T>): void,
}

export interface StateInterface<T> extends BaseSource<T>{
  // identity
  version: number,
  _source: Source<T>,
  config: ProducerConfig<T>,
  payload: Record<string, any> | null,

  // state
  state: State<T>,
  lastSuccess: State<T>,
  replaceState(newState: State<T>, notify?: boolean): void,

  // subscriptions
  subscriptionsIndex: number;
  subscriptions: Record<number, StateSubscription<T>> | null,

  // producer
  producerType: ProducerType,
  producer: ProducerFunction<T>,
  suspender: Promise<T> | undefined,
  originalProducer: Producer<T> | undefined,

  // lanes and forks
  forksIndex: number,
  parent: StateInterface<T> | null,
  lanes: Record<string, StateInterface<T>> | null,

  // cache
  cache: Record<string, CachedState<T>> | null,

  // dev properties
  journal: any[], // for devtools, dev only
  devModeConfiguration?: DevModeConfiguration,

  // methods & overrides
  dispose(): boolean,
  getLane(laneKey?: string): StateInterface<T>,
  fork(forkConfig?: ForkConfig): StateInterface<T>,

  // lanes and forks
  removeLane(laneKey?: string): boolean,
  getLane(laneKey?: string): BaseSource<T>,
  fork(forkConfig?: ForkConfig): BaseSource<T>,
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
  run: <T>(input: ProducerRunInput<T>, config: ProducerRunConfig | null, ...args: any[] ) => AbortFn,
  runp: <T>(input: ProducerRunInput<T>, config: ProducerRunConfig | null, ...args: any[] ) => Promise<State<T>> | undefined,

  select: <T>(input: AsyncStateKeyOrSource<T>) => State<T> | undefined,
}

export type ProducerEffectsCreator<T> = (props: ProducerProps<T>) => ProducerEffects;

export type ProducerRunInput<T> = AsyncStateKeyOrSource<T> | Producer<T>;

export type ProducerRunConfig = {
  lane?: string,
  fork?: boolean,
  payload?: Record<string, any> | null,
};

export type PendingTimeout = { id: ReturnType<typeof setTimeout>, startDate: number };
export type PendingUpdate = { timeoutId: ReturnType<typeof setTimeout>, callback(): void };
