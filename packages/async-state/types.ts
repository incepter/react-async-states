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

export type AbortFn = ((reason: any) => void) | undefined;

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
export type AsyncStateWatchKey = string | symbol;

export type AsyncStateStateFunctionUpdater<T> = (updater: State<T>) => T;

export type AsyncStateStateUpdater<T> = (updater: T | AsyncStateStateFunctionUpdater<T>, notify: boolean) => void;

export type AsyncStateSource<T> = {
  key: AsyncStateKey,
  uniqueId: number | undefined,
}

export type AsyncStateSubscription<T> = {
  cleanup: () => void,
  key: AsyncStateKey,
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

  subscriptions: { [id: number]: AsyncStateSubscription<T> },

  suspender: Promise<T> | undefined,
  producer: ProducerFunction<T>,
  readonly originalProducer: Producer<T> | undefined,

  // prototype functions
  dispose: () => boolean,
  abort: (reason: any) => void,
  run: (...args: any[]) => AbortFn,
  replaceState: AsyncStateStateUpdater<T>,
  fork: (forkConfig?: { keepState: boolean }) => AsyncStateInterface<T>,
  subscribe: (cb: Function, subscriptionKey?: AsyncStateKey) => AbortFn,
  setState: (newState: State<T>, notify?: boolean) => void,
}

export interface AsyncStateStateBuilderInterface {
  initial: <T> (initialValue: T) => State<T>,
  error: <T>(data: any, props: ProducerSavedProps<T>) => State<any>,
  success: <T>(data: T, props: ProducerSavedProps<T>) => State<T>,
  pending: <T>(props: ProducerSavedProps<T>) => State<null>,
  aborted: <T>(reason: any, props: ProducerSavedProps<T>) => State<any>,
}

export type ForkConfigType = {
  keepState: boolean,
  key?: AsyncStateKey,
}

export type StateSelector<T, E> = (state: State<T>) => E;
