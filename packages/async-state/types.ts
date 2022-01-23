import {AsyncStateKeyOrSource} from "react-async-states/src";

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

export interface ProducerProps<T> extends RunExtraProps {
  abort: AbortFn,
  aborted: boolean,
  onAbort: OnAbortFn,
  emit: StateUpdater<T>,

  args: any[],
  payload: any,
  cleared?: boolean,
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
  replaceState: StateUpdater<T>,
  setState: (newState: State<T>, notify?: boolean) => void,
  run: (extraProps: RunExtraProps, ...args: any[]) => AbortFn,
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

export type RunExtraProps = {
  select: <T>(
    input: AsyncStateKeyOrSource<T>
  ) => State<T> | undefined,

  run: <T>(
    input: AsyncStateKeyOrSource<T>,
    ...args: any[]
  ) => AbortFn,
  // runAndWait?: <T>(input: AsyncStateKeyOrSource<T>, ...args: any[]) => Promise<State<T>>,
  runFork: <T>(
    input: AsyncStateKeyOrSource<T>,
    config: ForkConfig,
    ...args: any[]
  ) => AbortFn,
};
