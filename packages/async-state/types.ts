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

export type AsyncStateStateType<T> = {
  data: T | any,
  status: AsyncStateStatus,
  props: ProducerSavedProps<T> | null,
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
  lastSuccess: AsyncStateStateType<T>
}

export type ProducerSavedProps<T> = {
  aborted: boolean,

  payload: any,
  args: any[],
  lastSuccess: AsyncStateStateType<T>
} | unknown

export type Producer<T> = (props: ProducerProps<T>) => T;
export type ProducerFunction<T> = (props: ProducerProps<T>) => AbortFn;

export type ProducerConfig<T> = {
  initialValue: T,
  runEffect: ProducerRunEffects | undefined,
  runEffectDurationMs: number | undefined,
}

export type AsyncStateKeyType = string | undefined;

export type AsyncStateStateFunctionUpdater<T> = (updater: AsyncStateStateType<T>) => T;

export type AsyncStateStateUpdater<T> = (updater: T | AsyncStateStateFunctionUpdater<T>, notify: boolean) => void;

export type AsyncStateSource = {
  key: AsyncStateKeyType,
  uniqueId: number | undefined,
}

export type AsyncStateSubscription<T> = {
  cleanup: () => void,
  key: AsyncStateKeyType,
  callback: (newState: AsyncStateStateType<T>) => void,
};

export interface AsyncStateInterface<T> {
  // new (key: AsyncStateKeyType, producer: Producer<T>, config: ProducerConfig<T>) : {},
  // properties
  key: AsyncStateKeyType,
  uniqueId: number | undefined,
  _source: AsyncStateSource,

  currentState: AsyncStateStateType<T>,
  lastSuccess: AsyncStateStateType<T>,

  payload: Object | null,
  config: ProducerConfig<T>,

  subscriptions: { [id: number]: AsyncStateSubscription<T> },

  suspender: Promise<T> | undefined,
  producer: ProducerFunction<T>,

  // prototype functions
  dispose: () => boolean,
  abort: (reason: any) => void,
  run: (...args: any[]) => AbortFn,
  replaceState: AsyncStateStateUpdater<T>,
  fork: (forkConfig: { keepState: boolean }) => AsyncStateInterface<T>,
  subscribe: (cb: Function, forkKey: AsyncStateKeyType) => () => void,
  setState: (newState: AsyncStateStateType<T>, notify?: boolean) => void,
}

export interface AsyncStateStateBuilderInterface {
  initial: <T> (initialValue: T) => AsyncStateStateType<T>,
  error: <T>(data: any, props: ProducerSavedProps<T>) => AsyncStateStateType<any>,
  success: <T>(data: T, props: ProducerSavedProps<T>) => AsyncStateStateType<T>,
  pending: <T>(props: ProducerSavedProps<T>) => AsyncStateStateType<null>,
  aborted: <T>(reason: any, props: ProducerSavedProps<T>) => AsyncStateStateType<any>,
}

export type ForkConfigType = {
  keepState: boolean,
  key?: AsyncStateKeyType,
}
