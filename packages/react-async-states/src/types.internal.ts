import {
  AbortFn,
  AsyncStateInterface,
  AsyncStateKey,
  AsyncStateSource,
  CacheConfig,
  CachedState,
  ForkConfig,
  Producer,
  ProducerConfig,
  ProducerProps,
  ProducerRunEffects,
  RunExtraProps,
  State,
  StateUpdater
} from "./async-state";

export type Reducer<T> = (
  T,
  ...args: any[]
) => T;

export type ExtendedInitialAsyncState<T> =
  InitialAsyncState<T>
  | AsyncStateSource<T>;

export type InitialAsyncState<T> = {
  key: AsyncStateKey,
  producer?: Producer<T>,
  config?: ProducerConfig<T>
}

export interface AsyncStateInitializer<T> {
  producer?: Producer<T>,
  key?: AsyncStateKey,
  config?: ProducerConfig<T>
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

export type AsyncStateWatchKey = string | symbol;

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

export type SelectorKeysArg = AsyncStateKey
  | AsyncStateKey[]
  | ((allKeys: AsyncStateKey[]) => (AsyncStateKey | AsyncStateKey[]))

export type AsyncStateSelector<T> =
  SimpleSelector<any, T>
  | ArraySelector<T>
  | FunctionSelector<T>;


export type HoistToProviderConfig = {
  override: boolean,
}

export type ManagerHoistConfig<T> = {
  initialValue?: T,
  runEffect?: ProducerRunEffects,
  runEffectDurationMs?: number,
  producer?: Producer<T>,

  key: AsyncStateKey,
  hoistToProviderConfig?: HoistToProviderConfig,
  cacheConfig?: CacheConfig<T>,
}

export type ManagerWatchCallbackValue<T> = AsyncStateInterface<T> | null;
export type ManagerWatchCallback<T> = (
  value: ManagerWatchCallbackValue<T>,
  additionalInfo: AsyncStateKey
) => void;

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
  entries: AsyncStateEntries,
  watchers: ManagerWatchers,
  run<T>(
    asyncState: AsyncStateInterface<T>,
    ...args: any[]
  ): AbortFn,
  get<T>(key: AsyncStateKey): AsyncStateInterface<T>,
  fork<T>(
    key: AsyncStateKey,
    config: ForkConfig
  ): AsyncStateInterface<T> | undefined,
  select<T>(
    keys: AsyncStateSelectorKeys,
    selector: AsyncStateSelector<T>,
    reduceToObject?: boolean
  ): T,
  hoist<T>(config: ManagerHoistConfig<T>): AsyncStateInterface<T>,
  dispose<T>(asyncState: AsyncStateInterface<T>): boolean,
  watch<T>(
    key: AsyncStateWatchKey,
    value: ManagerWatchCallback<T>
  ): AbortFn,
  notifyWatchers<T>(
    key: AsyncStateKey,
    value: ManagerWatchCallbackValue<T>
  ): void,
  runAsyncState<T>(
    keyOrSource: AsyncStateKeyOrSource<T>,
    ...args: any[]
  ): AbortFn,
  getAllKeys(): AsyncStateKey[],
  watchAll(cb: ManagerWatchCallback<any>),
  setInitialStates(initialStates?: InitialStates): AsyncStateEntry<any>[],

  runExtraPropsCreator<T>(props: ProducerProps<T>): RunExtraProps,
}

// end manager types

export type AsyncStateContextValue = {
  manager: AsyncStateManagerInterface,
  payload: { [id: string]: any },
  run<T>(
    asyncState: AsyncStateInterface<T>,
    ...args: any[]
  ): AbortFn,
  get<T>(key: AsyncStateKey): AsyncStateInterface<T>,
  fork<T>(
    key: AsyncStateKey,
    config?: ForkConfig
  ): AsyncStateInterface<T> | undefined,
  select<T>(
    keys: AsyncStateSelectorKeys,
    selector: AsyncStateSelector<T>,
    reduceToObject?: boolean
  ): T,
  hoist<T>(config: ManagerHoistConfig<T>): AsyncStateInterface<T>,
  dispose<T>(asyncState: AsyncStateInterface<T>): boolean,
  watch<T>(
    key: AsyncStateWatchKey,
    value: ManagerWatchCallback<T>
  ): AbortFn,
  notifyWatchers<T>(
    key: AsyncStateKey,
    value: ManagerWatchCallbackValue<T>
  ): void,
  runAsyncState<T>(
    keyOrSource: AsyncStateKeyOrSource<T>,
    ...args: any[]
  ): AbortFn,
  getAllKeys(): AsyncStateKey[],
  watchAll(cb: ManagerWatchCallback<any>),

  runExtraPropsCreator<T>(props: ProducerProps<T>): RunExtraProps,
}


// use async state

export type UseSelectedAsyncState<T, E> = {
  state: E,
  key: AsyncStateKey,

  source?: AsyncStateSource<T>,
  mode: AsyncStateSubscriptionMode,
  lastSuccess?: State<T>,

  payload: { [id: string]: any } | null,

  abort: ((reason?: any) => void),
  run: (...args: any[]) => AbortFn,
  replaceState: StateUpdater<T>,
  mergePayload: (argv: { [id: string]: any }) => void,

  invalidateCache: (cacheKey?: string) => void,

  read: () => E,
}

export type UseAsyncState<T> = UseSelectedAsyncState<T, State<T>>

export type EqualityFn<T> = (
  prev: T,
  next: T
) => boolean;


export type UseAsyncStateConfiguration<T, E> = {
  key?: AsyncStateKey,
  source?: AsyncStateSource<T>,
  initialValue?: T,
  runEffect?: ProducerRunEffects,
  runEffectDurationMs?: number,
  payload?: { [id: string]: any },

  lazy?: boolean,
  fork?: boolean,
  condition?: boolean,
  hoistToProvider?: boolean,
  forkConfig?: ForkConfig,
  hoistToProviderConfig?: HoistToProviderConfig,

  subscriptionKey?: AsyncStateKey,

  producer?: Producer<T>,
  selector: UseAsyncStateSelector<T, E>,
  areEqual: EqualityFn<E>,

  postSubscribe?: (props: PostSubscribeProps<T>) => CleanupFn,

  cacheConfig?: CacheConfig<T>,
}

export type PostSubscribeProps<T> = {
  getState: () => State<T>,
  run: (...args: any[]) => AbortFn,
  mode: AsyncStateSubscriptionMode,
  invalidateCache: (cacheKey?: string) => void,
}

export type UseAsyncStateSelector<T, E> = (
  ((currentState: State<T>) => E)
  |
  ((currentState: State<T>, lastSuccess: State<T>) => E)
  |
  ((
    currentState: State<T>, lastSuccess: State<T>,
    cache: { [id: string]: CachedState<T> }
  ) => E))
  ;

export type PartialUseAsyncStateConfiguration<T, E> = {
  key?: AsyncStateKey,
  source?: AsyncStateSource<T>,
  initialValue?: T,
  runEffect?: ProducerRunEffects,
  runEffectDurationMs?: number,
  payload?: { [id: string]: any },

  lazy?: boolean,
  fork?: boolean,
  condition?: boolean,
  hoistToProvider?: boolean,
  forkConfig?: ForkConfig,
  hoistToProviderConfig?: HoistToProviderConfig,

  subscriptionKey?: AsyncStateKey,

  producer?: Producer<T>,
  selector?: UseAsyncStateSelector<T, E>,
  areEqual?: EqualityFn<E>,

  postSubscribe?: (props: PostSubscribeProps<T>) => CleanupFn,

  cacheConfig?: CacheConfig<T>,
}

export type UseAsyncStateSubscriptionInfo<T, E> = {
  mode: AsyncStateSubscriptionMode,
  asyncState: AsyncStateInterface<T>,
  configuration: UseAsyncStateConfiguration<T, E>,

  guard: Object,
  deps: readonly any[],

  dispose: () => boolean | undefined,
  run: (...args: any[]) => AbortFn,
}

export type UseAsyncStateRefsFactory<T, E> = {
  returnValue?: UseSelectedAsyncState<T, E>,
  subscriptionInfo?: UseAsyncStateSubscriptionInfo<T, E>
};

export type UseAsyncStateContextType = AsyncStateContextValue | null;

export type UseAsyncStateConfig<T, E> =
  string
  | Producer<T>
  | AsyncStateSource<T>
  | UseAsyncStateConfiguration<T, E>
  | Partial<UseAsyncStateConfiguration<T, E>>;

export type UseSimpleAsyncStateConfig<T> = UseAsyncStateConfig<T, State<T>>;

export type InitialStatesObject = { [id: string]: ExtendedInitialAsyncState<any> };

export type InitialStates = ExtendedInitialAsyncState<any>[]
  | InitialStatesObject;

export type StateProviderProps = {
  children: any,
  initialStates?: InitialStates,
  payload?: { [id: string]: any },
}

export type CleanupFn = AbortFn
  | (() => void)
  | undefined;

export type MemoizedUseAsyncStateRef<T, E> = {
  subscriptionInfo: UseAsyncStateSubscriptionInfo<T, E>
}

export type SelectorManager = {
  didUnmount: boolean,
  has: (key: string) => boolean,
  subscriptions: SelectorSubscriptionsMap,
}

export type SelectorSubscriptionsMap = {
  [id: string]: SelectorSubscription<any>,
}

export type SelectorSubscription<T> = {
  cleanup: CleanupFn,
  asyncState: AsyncStateInterface<T>,
}

export interface UseAsyncStateType<T, E> {
  (
    subscriptionConfig: UseAsyncStateConfig<T, E>,
    dependencies?: any[]
  ): UseSelectedAsyncState<T, E>,

  auto(
    subscriptionConfig: UseAsyncStateConfig<T, E>,
    dependencies?: any[]
  ): UseSelectedAsyncState<T, E>,

  lazy(
    subscriptionConfig: UseAsyncStateConfig<T, E>,
    dependencies?: any[]
  ): UseSelectedAsyncState<T, E>,

  fork(
    subscriptionConfig: UseAsyncStateConfig<T, E>,
    dependencies?: any[]
  ): UseSelectedAsyncState<T, E>,

  hoist(
    subscriptionConfig: UseAsyncStateConfig<T, E>,
    dependencies?: any[]
  ): UseSelectedAsyncState<T, E>,

  forkAuto(
    subscriptionConfig: UseAsyncStateConfig<T, E>,
    dependencies?: any[]
  ): UseSelectedAsyncState<T, E>,

  hoistAuto(
    subscriptionConfig: UseAsyncStateConfig<T, E>,
    dependencies?: any[]
  ): UseSelectedAsyncState<T, E>,
}
