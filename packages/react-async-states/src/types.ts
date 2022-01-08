import {
  AbortFn,
  AsyncStateInterface,
  AsyncStateKey,
  AsyncStateSource, AsyncStateWatchKey, ForkConfigType,
  Producer,
  ProducerConfig,
  State
} from "../../async-state";
import {shallowClone} from "../../shared";

export type Reducer<T> = (T, ...args: any[]) => T;

export type InitialAsyncState<T> = {
  key: AsyncStateKey,
  producer: Producer<T>,
  config: ProducerConfig<T>
}

export interface AsyncStateInitializer<T> {
  producer?: Producer<T>,
  key?: AsyncStateKey,
  config?: ProducerConfig<T>
}

export type AsyncStateBuilderFunction<T> = {
  build: () => AsyncStateInitializer<T>;
  key: (key: AsyncStateKey) => AsyncStateBuilderFunction<T>,
  producer: (producer: Producer<T>) => AsyncStateBuilderFunction<T>,
  config: (config: ProducerConfig<T>) => AsyncStateBuilderFunction<T>,
}

export enum AsyncStateSubscriptionMode {
  LISTEN = "LISTEN", // simple listener
  HOIST = "HOIST", // hoisting a producer, for first time and intended to be shared, more like of an injection
  STANDALONE = "STANDALONE", // working standalone even if inside provider
  WAITING = "WAITING", // waits for the original to be hoisted
  FORK = "FORK", // forking an existing one in the provider
  NOOP = "NOOP", // a weird case that should not happen
  SOURCE = "SOURCE", // subscription via source property
  SOURCE_FORK = "SOURCE_FORK", // subscription via source property and fork
  OUTSIDE_PROVIDER = "OUTSIDE_PROVIDER", // standalone outside provider
}

// manager types

export type AsyncStateEntry<T> = {
  initiallyHoisted?: boolean,
  value: AsyncStateInterface<T>,
}

export type AsyncStateEntries = {
  [id: AsyncStateKey]: AsyncStateEntry<any>,
}

export type AsyncStateKeyOrSource<T> = string | AsyncStateSource<T>;

export type AsyncStateSelectorKeys = string[];

export type SimpleSelector<T, E> = (state: State<T>) => E;
export type ArraySelector<T> = (...states: (State<any> | undefined)[]) => T;

export type FunctionSelectorArgument = ({ [id: AsyncStateKey]: State<any> | undefined });
export type FunctionSelector<T> = (arg: FunctionSelectorArgument) => T;

export type AsyncStateSelector<T> = SimpleSelector<any, T> | ArraySelector<T> | FunctionSelector<T>;


export type HoistToProviderConfig = {
  override: boolean,
}

export type ManagerHoistConfig<T> = {
  producer: Producer<T>,
  key: AsyncStateKey,
  hoistToProviderConfig: HoistToProviderConfig,
}

export type ManagerWatchCallbackValue<T> = AsyncStateInterface<T> | null;
export type ManagerWatchCallback<T> = (value: ManagerWatchCallbackValue<T>, additionalInfo?: any) => void;

export type WatcherType = {
  cleanup: AbortFn,
  notify: ManagerWatchCallback<any>,
}

export type ManagerWatchers = {
  meter: number,
  watchers: {
    [id: string | symbol]: WatcherType
  }
}


export type AsyncStateManagerInterface = {
  watchers: ManagerWatchers,
  run<T>(asyncState: AsyncStateInterface<T>, ...args: any[]): AbortFn,
  get<T>(key: AsyncStateKey): AsyncStateInterface<T>,
  fork<T>(key: AsyncStateKey, config: ForkConfigType): AsyncStateInterface<T> | undefined,
  select<T>(keys: AsyncStateSelectorKeys, selector: AsyncStateSelector<T>, reduceToObject?: boolean): T,
  hoist<T>(config: ManagerHoistConfig<T>): AsyncStateInterface<T>,
  dispose<T>(asyncState: AsyncStateInterface<T>): boolean,
  watch<T>(key: AsyncStateWatchKey, value: ManagerWatchCallback<T>): AbortFn,
  notifyWatchers<T>(key: AsyncStateKey, value: ManagerWatchCallbackValue<T>): void,
  runAsyncState<T>(keyOrSource: AsyncStateKeyOrSource<T>, ...args: any[]): AbortFn,
  getAllKeys(): AsyncStateKey[],
  watchAll(cb: ManagerWatchCallback<any>),
} | undefined

// end manager types

export type AsyncStateContextValue = {
  manager: AsyncStateManagerInterface,
  payload: {[id: string]: any},
  run<T>(asyncState: AsyncStateInterface<T>, ...args: any[]): AbortFn,
  get<T>(key: AsyncStateKey): AsyncStateInterface<T>,
  fork<T>(key: AsyncStateKey, config: ForkConfigType): AsyncStateInterface<T> | undefined,
  select<T>(keys: AsyncStateSelectorKeys, selector: AsyncStateSelector<T>, reduceToObject?: boolean): T,
  hoist<T>(config: ManagerHoistConfig<T>): AsyncStateInterface<T>,
  dispose<T>(asyncState: AsyncStateInterface<T>): boolean,
  watch<T>(key: AsyncStateWatchKey, value: ManagerWatchCallback<T>): AbortFn,
  notifyWatchers<T>(key: AsyncStateKey, value: ManagerWatchCallbackValue<T>): void,
  runAsyncState<T>(keyOrSource: AsyncStateKeyOrSource<T>, ...args: any[]): AbortFn,
  getAllKeys(): AsyncStateKey[],
  watchAll(cb: ManagerWatchCallback<any>),
}
