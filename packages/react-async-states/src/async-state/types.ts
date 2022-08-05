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

export type AsyncStateKey = string;

export type StateFunctionUpdater<T> = (updater: State<T>) => T;

export type StateUpdater<T> = (
  updater: T | StateFunctionUpdater<T>,
  status?: AsyncStateStatus
) => void;

export type AsyncStateSource<T> = {
  key: AsyncStateKey,
  uniqueId: number | undefined,
}

export type StateSubscription<T> = {
  key: AsyncStateKey, // subscription key
  cleanup: () => void,
  callback: (newState: State<T>) => void,
};

export type CacheConfig<T> = {
  enabled: boolean,
  getDeadline?(currentState: State<T>): number,
  hash?(args?: any[], payload?: {[id: string]: any} | null): string,

  load?(): {[id: AsyncStateKey]: CachedState<T>} | Promise<{[id: AsyncStateKey]: CachedState<T>}>,
  persist?(cache: {[id: AsyncStateKey]: CachedState<T>}): void,

  onCacheLoad?({cache, setState}: {cache: Record<string, CachedState<T>>, setState: T | StateFunctionUpdater<T>}): void,
}

export type CachedState<T> = {
  state: State<T>,
  addedAt: number,
  deadline: number,
}

export interface AsyncStateInterface<T> {
  // properties
  key: AsyncStateKey,
  uniqueId: number | undefined,
  _source: AsyncStateSource<T>,

  currentState: State<T>,
  lastSuccess: State<T>,

  cache: Record<string, CachedState<T>>,
  invalidateCache: (cacheKey?: string) => void,

  payload: Record<string, any> | null,
  config: ProducerConfig<T>,

  subscriptions: { [id: number]: StateSubscription<T> },

  suspender: Promise<T> | undefined,
  producer: ProducerFunction<T>,
  producerType: ProducerType,
  readonly originalProducer: Producer<T> | undefined,

  // prototype functions
  dispose: () => boolean,
  abort: (reason: any) => void,
  replaceState: StateUpdater<T>,
  setState: (newState: State<T>, notify?: boolean) => void,
  run: (createProducerEffects: ProducerEffectsCreator<T>, ...args: any[]) => AbortFn,
  fork: (forkConfig?: ForkConfig) => AsyncStateInterface<T>,
  subscribe: (cb: Function, subscriptionKey?: AsyncStateKey) => AbortFn,

  parent: AsyncStateInterface<T> | null,
  lanes: Record<string, AsyncStateInterface<T>>,
  getLane(laneKey?: string): AsyncStateInterface<T>,

  replaceProducer(newProducer: Producer<any>),
  replay(): AbortFn,
}

export interface StateBuilderInterface {
  initial: <T> (initialValue: T) => State<T>,
  pending: <T>(props: ProducerSavedProps<T>) => State<T>,
  success: <T>(data: T, props: ProducerSavedProps<T>) => State<T>,
  error: <T>(data: any, props: ProducerSavedProps<T>) => State<any>,
  aborted: <T>(reason: any, props: ProducerSavedProps<T>) => State<any>,
}

export type ForkConfig = {
  key?: AsyncStateKey,
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
  payload?: { [id: string]: any } | null,
};
