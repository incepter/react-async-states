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
  data: T | any,
  status: AsyncStateStatus,
  props?: ProducerSavedProps<T> | null,
};

export type AbortFn = ((reason?: any) => void) | undefined;

export type OnAbortFn = (cb: () => void) => void;

export type ProducerProps<T> = {
  abort: AbortFn,
  aborted: boolean,
  onAbort: OnAbortFn,

  args: any[],
  payload: any,
  fulfilled?: boolean,
  lastSuccess: State<T>
}

export type ProducerSavedProps<T> = {
  aborted?: boolean,

  payload?: any,
  args?: any[],
  lastSuccess?: State<T>
}

export type Producer<T> = (props: ProducerProps<T>) => T;
export type ProducerFunction<T> = (props: ProducerProps<T>) => AbortFn;

export type ProducerConfig<T> = {
  initialValue?: T,
  runEffectDurationMs?: number,
  runEffect?: ProducerRunEffects,
}

export type AsyncStateKey = string;

export type StateFunctionUpdater<T> = (updater: State<T>) => T;

export type StateUpdater<T> = (
  updater: T | StateFunctionUpdater<T>,
  notify: boolean
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

export interface AsyncStateInterface<T> {
  // new (key: AsyncStateKey, producer: Producer<T>, config: ProducerConfig<T>) : {},
  // properties
  key: AsyncStateKey,
  uniqueId: number | undefined,
  _source: AsyncStateSource<T>,

  currentState: State<T>,
  lastSuccess: State<T>,

  payload: { [id: string]: any } | null,
  config: ProducerConfig<T>,

  subscriptions: { [id: number]: StateSubscription<T> },

  suspender: Promise<T> | undefined,
  producer: ProducerFunction<T>,
  readonly originalProducer: Producer<T> | undefined,

  // prototype functions
  dispose: () => boolean,
  abort: (reason: any) => void,
  run: (...args: any[]) => AbortFn,
  replaceState: StateUpdater<T>,
  setState: (newState: State<T>, notify?: boolean) => void,
  fork: (forkConfig?: { keepState: boolean }) => AsyncStateInterface<T>,
  subscribe: (cb: Function, subscriptionKey?: AsyncStateKey) => AbortFn,
}

export interface StateBuilderInterface {
  initial: <T> (initialValue: T) => State<T>,
  pending: <T>(props: ProducerSavedProps<T>) => State<null>,
  success: <T>(data: T, props: ProducerSavedProps<T>) => State<T>,
  error: <T>(data: any, props: ProducerSavedProps<T>) => State<any>,
  aborted: <T>(reason: any, props: ProducerSavedProps<T>) => State<any>,
}

export type ForkConfig = {
  keepState: boolean,
  key?: AsyncStateKey,
}
