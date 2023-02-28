import {
  __DEV__,
  asyncStatesKey,
  cloneProducerProps,
  defaultHash,
  didNotExpire,
  emptyArray,
  isFunction,
  isPromise,
  isServer,
  maybeWindow,
  nextKey,
} from "./utils";
import devtools from "./devtools/Devtools";
import {hideStateInstanceInNewObject} from "./hide-object";
import {
  AbortFn,
  AsyncStateSubscribeProps,
  CachedState,
  CreatePropsConfig,
  CreateSourceObject,
  ErrorState,
  ForkConfig,
  HydrationData,
  InstanceCacheChangeEvent,
  InstanceCacheChangeEventHandlerType,
  InstanceChangeEvent,
  InstanceChangeEventHandlerType,
  InstanceDisposeEvent,
  InstanceDisposeEventHandlerType,
  InstanceEventHandlerType,
  InstanceEvents,
  InstanceEventType,
  LastSuccessSavedState,
  LibraryPoolsContext,
  PendingTimeout,
  PendingUpdate,
  PoolInterface,
  Producer,
  ProducerCallbacks,
  ProducerConfig,
  ProducerProps,
  ProducerRunConfig,
  ProducerRunInput,
  ProducerSavedProps,
  RUNCProps,
  RunTask,
  Source,
  SourcesType,
  State,
  StateChangeEventHandler,
  StateFunctionUpdater,
  StateInterface,
  StateSubscription,
  SuccessState,
  UpdateQueue
} from "./types";
import {aborted, error, pending, RunEffect, Status, success} from "./enums";
import {
  requestContext,
  warnAboutAlreadyExistingSourceWithSameKey
} from "./pool";
import {run} from "./wrapper";
import {isSource, sourceSymbol} from "./helpers/isSource";
import {StateBuilder} from "./helpers/StateBuilder";
import {freeze, isArray, now} from "./helpers/corejs";

export class AsyncState<T, E, R, A extends unknown[]> implements StateInterface<T, E, R, A> {
  journal?: any[];

  _source: Source<T, E, R, A>;
  _producer: Producer<T, E, R, A> | undefined;

  key: string;
  uniqueId: number;
  version: number = 0;
  private locks?: number;
  payload?: Record<string, any>;
  config: ProducerConfig<T, E, R, A>;
  cache?: Record<string, CachedState<T, E, R, A>>;

  promise?: Promise<T>;
  currentAbort?: AbortFn;
  state: State<T, E, R, A>;
  queue?: UpdateQueue<T, E, R, A>;
  pendingUpdate?: PendingUpdate | null;
  lastSuccess: LastSuccessSavedState<T, A>;
  private pendingTimeout?: PendingTimeout | null;

  flushing?: boolean;
  eventsIndex?: number;
  events?: InstanceEvents<T, E, R, A>;

  forksIndex?: number;
  parent?: StateInterface<T, E, R, A> | null;
  lanes?: Record<string, StateInterface<T, E, R, A>> | null;

  subsIndex?: number;
  subscriptions?: Record<number, StateSubscription<T, E, R, A>> | null;

  willUpdate?: boolean;
  isEmitting?: boolean;
  latestRun?: RunTask<T, E, R, A> | null;

  readonly pool: PoolInterface;

  constructor(
    key: string,
    producer: Producer<T, E, R, A> | undefined | null,
    config?: ProducerConfig<T, E, R, A>,
  ) {

    let ctx = config && config.context;
    let {poolInUse: poolToUse, getOrCreatePool} = requestContext(ctx);

    let poolName = config && config.pool;
    if (poolName) {
      poolToUse = getOrCreatePool(poolName);
    }

    let maybeInstance = poolToUse.instances
      .get(key) as AsyncState<T, E, R, A> | undefined;

    if (maybeInstance) {
      if (__DEV__) {
        warnAboutAlreadyExistingSourceWithSameKey(key);
      }
      maybeInstance.replaceProducer(producer || undefined);
      maybeInstance.patchConfig(config);
      return maybeInstance;
    }

    this.bindMethods();
    if (__DEV__) {
      this.journal = [];
    }
    poolToUse.set(key, this);

    this.key = key;
    this.pool = poolToUse;
    this.uniqueId = nextUniqueId();
    this._source = makeSource(this);
    this.config = shallowClone(config);
    this._producer = producer ?? undefined;

    loadCache(this);

    let maybeHydratedState = attemptHydratedState<T, E, R, A>(this.pool.name, this.key);
    if (maybeHydratedState) {
      this.state = maybeHydratedState.state;
      this.payload = maybeHydratedState.payload;
      this.latestRun = maybeHydratedState.latestRun;

      if (this.state.status === success) {
        this.lastSuccess = this.state;
      } else {
        let initializer = this.config.initialValue;
        let initialData = isFunction(initializer) ? initializer(this.cache) : initializer;
        this.lastSuccess = StateBuilder.initial(initialData) as LastSuccessSavedState<T, A>;
      }
    } else {
      let initializer = this.config.initialValue;
      let initialData = isFunction(initializer) ? initializer(this.cache) : initializer as T;

      let initialState = StateBuilder.initial<T, A>(initialData);

      this.state = initialState;
      this.lastSuccess = initialState as LastSuccessSavedState<T, A>;
    }

    if (__DEV__) {
      devtools.emitCreation(this);
    }
  }

  private bindMethods() {
    this.on = this.on.bind(this);
    this.run = this.run.bind(this);
    this.runp = this.runp.bind(this);
    this.runc = this.runc.bind(this);
    this.abort = this.abort.bind(this);
    this.getState = this.getState.bind(this);
    this.setState = this.setState.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.getPayload = this.getPayload.bind(this);
    this.mergePayload = this.mergePayload.bind(this);

    this.replay = this.replay.bind(this);
    this.hasLane = this.hasLane.bind(this);
    this.getConfig = this.getConfig.bind(this);
    this.getVersion = this.getVersion.bind(this);
    this.removeLane = this.removeLane.bind(this);
    this.patchConfig = this.patchConfig.bind(this);
    this.replaceCache = this.replaceCache.bind(this);
    this.invalidateCache = this.invalidateCache.bind(this);
    this.replaceProducer = this.replaceProducer.bind(this);
  }

  getVersion(): number {
    return this.version;
  }

  getState(): State<T, E, R, A> {
    return this.state;
  }

  getConfig(): ProducerConfig<T, E, R, A> {
    return this.config;
  }

  on(
    eventType: InstanceChangeEvent,
    eventHandler: InstanceChangeEventHandlerType<T, E, R, A>
  ): (() => void)
  on(
    eventType: InstanceDisposeEvent,
    eventHandler: InstanceDisposeEventHandlerType<T, E, R, A>
  ): (() => void)
  on(
    eventType: InstanceCacheChangeEvent,
    eventHandler: InstanceCacheChangeEventHandlerType<T, E, R, A>
  ): (() => void)
  on(
    eventType: InstanceEventType,
    eventHandler: InstanceEventHandlerType<T, E, R, A>
  ): (() => void) {
    if (!this.events) {
      this.events = {} as InstanceEvents<T, E, R, A>;
    }
    if (!this.events[eventType]) {
      this.events[eventType] = {};
    }

    let events = this.events[eventType]!;

    if (!this.eventsIndex) {
      this.eventsIndex = 0;
    }
    let index = ++this.eventsIndex;

    events[index] = eventHandler;

    return function () {
      delete events[index];
    }
  }

  patchConfig(partialConfig?: Partial<ProducerConfig<T, E, R, A>>) {
    Object.assign(this.config, partialConfig);
  }

  getPayload(): Record<string, any> {
    if (!this.payload) {
      this.payload = {};
    }
    return this.payload;
  }

  hasLane(laneKey: string): boolean {
    if (!this.lanes) {
      return false;
    }
    return !!this.lanes[laneKey];
  }

  removeLane(laneKey?: string): boolean {
    if (!this.lanes || !laneKey) {
      return false;
    }
    return delete this.lanes[laneKey];
  }

  getLane(laneKey?: string): StateInterface<T, E, R, A> {
    if (!laneKey) {
      return this;
    }
    if (!this.lanes) {
      this.lanes = {};
    }
    if (this.lanes[laneKey]) {
      return this.lanes[laneKey];
    }

    const newLane = this.fork({
      key: laneKey,
      keepCache: true,
      keepState: false,
    });
    newLane.parent = this;

    this.lanes[laneKey] = newLane;
    return newLane;
  }

  replaceState(
    newState: State<T, E, R, A>,
    notify: boolean = true,
    callbacks?: ProducerCallbacks<T, E, R, A>
  ): void {
    let {config} = this;
    let isPending = newState.status === pending;

    if (isPending && config.skipPendingStatus) {
      return;
    }

    if (this.queue) {
      enqueueUpdate(this, newState, callbacks);
      return;
    }

    if (
      config.keepPendingForMs &&
      this.state.status === pending &&
      !this.flushing
    ) {
      enqueueUpdate(this, newState, callbacks);
      return;
    }

    // pending update has always a pending status
    // setting the state should always clear this pending update
    // because it is stale, and we can safely skip it
    if (this.pendingUpdate) {
      clearTimeout(this.pendingUpdate.timeoutId);
      this.pendingUpdate = null;
    }

    if (
      isPending &&
      this.config.skipPendingDelayMs &&
      isFunction(setTimeout) &&
      this.config.skipPendingDelayMs > 0
    ) {
      scheduleDelayedPendingUpdate(this, newState, notify);
      return;
    }

    if (__DEV__) devtools.startUpdate(this);
    this.state = newState;
    this.version += 1;
    invokeChangeCallbacks(newState, callbacks);
    invokeInstanceEvents(this, "change");
    if (__DEV__) devtools.emitUpdate(this);

    if (this.state.status === success) {
      this.lastSuccess = this.state;
      if (isCacheEnabled(this)) {
        saveCacheAfterSuccessfulUpdate(this);
      }
    }

    if (!isPending) {
      this.promise = undefined;
    }

    if (notify && !this.flushing) {
      notifySubscribers(this as StateInterface<T, E, R, A>);
    }
  }

  subscribe(cb: (s: State<T, E, R, A>) => void): AbortFn
  subscribe(subProps: AsyncStateSubscribeProps<T, E, R, A>): AbortFn
  subscribe(argv: ((s: State<T, E, R, A>) => void) | AsyncStateSubscribeProps<T, E, R, A>): AbortFn {
    let props = isFunction(argv) ? {cb: argv} : argv;
    if (!isFunction(props.cb)) {
      return;
    }

    if (!this.subsIndex) {
      this.subsIndex = 0;
    }
    if (this.locks === undefined) {
      this.locks = 0;
    }
    if (!this.subscriptions) {
      this.subscriptions = {};
    }

    let that = this;
    this.subsIndex += 1;

    let subscriptionKey: string | undefined = props.key;

    if (subscriptionKey === undefined) {
      subscriptionKey = `$${this.subsIndex}`;
    }

    function cleanup() {
      that.locks! -= 1;
      delete that.subscriptions![subscriptionKey!];
      if (__DEV__) devtools.emitUnsubscription(that, subscriptionKey!);
      if (that.config.resetStateOnDispose) {
        if (Object.values(that.subscriptions!).length === 0) {
          that.dispose();
        }
      }
    }

    this.subscriptions[subscriptionKey] = {props, cleanup};
    this.locks += 1;

    if (__DEV__) devtools.emitSubscription(this, subscriptionKey);
    return cleanup;
  }

  setState(
    newValue: T | StateFunctionUpdater<T, E, R, A>, status: Status = success,
    callbacks?: ProducerCallbacks<T, E, R, A>
  ): void {
    if (!StateBuilder[status]) {
      throw new Error(`Unknown status ('${status}')`);
    }
    if (this.queue) {
      enqueueSetState(this, newValue, status, callbacks);
      return;
    }
    this.willUpdate = true;
    if (this.state?.status === pending || (
      isFunction(this.currentAbort) && !this.isEmitting
    )) {
      this.abort();
      this.currentAbort = undefined;
    }

    let effectiveValue = newValue;
    if (isFunction(newValue)) {
      effectiveValue = newValue(this.state);
    }
    const savedProps = cloneProducerProps<T, E, R, A>({
      args: [effectiveValue] as A,
      payload: shallowClone(this.payload),
    });
    if (__DEV__) devtools.emitReplaceState(this, savedProps);
    // @ts-ignore
    let newState = StateBuilder[status](effectiveValue, savedProps) as State<T, E, R, A>;
    this.replaceState(newState, true, callbacks);
    this.willUpdate = false;
  }

  replay(): AbortFn {
    let latestRunTask = this.latestRun;
    if (!latestRunTask) {
      return undefined;
    }
    let {args, payload} = latestRunTask;
    return this.runImmediately(payload, {args});
  }

  replaceProducer(newProducer: Producer<T, E, R, A> | undefined) {
    this._producer = newProducer;
  }

  invalidateCache(cacheKey?: string) {
    if (isCacheEnabled(this)) {
      const topLevelParent: StateInterface<T, E, R, A> = getTopLevelParent(this);

      if (!cacheKey) {
        topLevelParent.cache = {};
      } else if (topLevelParent.cache) {
        delete topLevelParent.cache[cacheKey];
      }

      if (
        topLevelParent.cache &&
        isFunction(topLevelParent.config.cacheConfig?.persist)
      ) {
        topLevelParent.config.cacheConfig!.persist(topLevelParent.cache);
      }

      spreadCacheChangeOnLanes(topLevelParent);
    }
  }

  run(...args: A) {
    return this.runc({args});
  }

  runp(...args: A) {
    let instance = this;
    return new Promise<State<T, E, R, A>>(function runpPromise(resolve) {
      instance.runc({
        args,
        onError: resolve,
        onSuccess: resolve,
        onAborted: resolve
      });
    });
  }

  runc(props?: RUNCProps<T, E, R, A>) {
    let effectDurationMs = Number(this.config.runEffectDurationMs) || 0;
    let runNow = !isFunction(setTimeout) || !this.config.runEffect || effectDurationMs === 0;

    if (runNow) {
      return this.runImmediately(shallowClone(this.payload), props);
    }
    return this.runWithEffect(props);
  }

  private runWithEffect(props?: RUNCProps<T, E, R, A>): AbortFn {
    let that = this;
    let effectDurationMs = Number(this.config.runEffectDurationMs) || 0;

    function scheduleDelayedRun(startDate) {
      let abortCallback: AbortFn | null = null;
      let timeoutId = setTimeout(function realRun() {
        that.pendingTimeout = null;
        abortCallback = that.runImmediately(shallowClone(that.payload), props);
      }, effectDurationMs);

      that.pendingTimeout = {startDate, id: timeoutId,};

      return function abortCleanup(reason) {
        clearTimeout(timeoutId);
        that.pendingTimeout = null;
        if (isFunction(abortCallback)) {
          abortCallback(reason);
        }
      }
    }

    if (isFunction(setTimeout) && this.config.runEffect) {
      const now = Date.now();

      switch (this.config.runEffect) {
        case RunEffect.delay:
        case RunEffect.debounce: {
          if (this.pendingTimeout) {
            const deadline = this.pendingTimeout.startDate + effectDurationMs;
            if (now < deadline) {
              clearTimeout(this.pendingTimeout.id);
            }
          }
          return scheduleDelayedRun(now);
        }
        case RunEffect.throttle: {
          if (this.pendingTimeout) {
            const deadline = this.pendingTimeout.startDate + effectDurationMs;
            if (now <= deadline) {
              return function noop() {
                // this functions does nothing
              };
            }
            break;
          } else {
            return scheduleDelayedRun(now);
          }
        }
      }
    }
    return this.runImmediately(shallowClone(this.payload), props);
  }

  private runImmediately(
    payload: Record<string, any>,
    runProps?: RUNCProps<T, E, R, A>,
  ): AbortFn {

    let instance = this;
    let args = (runProps?.args || emptyArray) as A;

    this.willUpdate = true;
    if (instance.state.status === pending || instance.pendingUpdate) {
      if (this.pendingUpdate) {
        clearTimeout(this.pendingUpdate.timeoutId);
        this.pendingUpdate = null;
      }
      this.abort();
      this.currentAbort = undefined;
    } else if (isFunction(this.currentAbort)) {
      this.currentAbort();
    }

    let didConsumeFromCache = attemptCache(this, payload, runProps);
    if (didConsumeFromCache) {
      this.willUpdate = false;
      return;
    }

    this.latestRun = {payload, args};
    let producer = instance._producer;

    if (!isFunction(producer)) {
      // this is not safe, ts-ignore
      // @ts-ignore
      instance.setState(args[0], args[1], runProps);
      this.willUpdate = false;
      return;
    }

    let {retryConfig} = instance.config;
    let indicators = {index: 1, done: false, cleared: false, aborted: false};


    let props = createProps({
      args,
      payload,
      indicators,
      getState: instance.getState,
      context: instance.pool.context,
      lastSuccess: instance.lastSuccess,
      onCleared() {
        instance.currentAbort = undefined;
      },
      onAborted(reason?: R) {
        if (!instance.willUpdate) {
          let abortedState = StateBuilder.aborted<T, E, R, A>(reason, cloneProducerProps(props));
          instance.replaceState(abortedState, true, runProps);
        }
      },
      onEmit(updater, status) {
        instance.isEmitting = true;
        instance.setState(updater, status, runProps);
        instance.isEmitting = false;
      },
    });

    this.currentAbort = props.abort;
    let result = run(producer, props, indicators, onSettled, retryConfig, runProps);

    if (result) { // Promise<T>
      if (__DEV__) devtools.emitRunPromise(this, cloneProducerProps(props));

      this.promise = result;
      let pendingState = StateBuilder.pending(cloneProducerProps(props));
      this.replaceState(pendingState, true, runProps);

      this.willUpdate = false;
      return props.abort;
    } else if (__DEV__) {
      devtools.emitRunSync(this, cloneProducerProps(props));
    }

    this.willUpdate = false;

    function onSettled(
      data: T | E,
      status: Status.success | Status.error,
      savedProps: ProducerSavedProps<T, A>,
      callbacks?: ProducerCallbacks<T, E, R, A>
    ) {
      if (savedProps === null) {
        // this means there were no producer at all, and this is an imperative update
        // @ts-ignore need to overload setState to accept E and R too with their statuses
        instance.setState(data, status, callbacks);
        return;
      }
      let state = freeze(
        {status, data, props: savedProps, timestamp: now()} as
          (SuccessState<T, A> | ErrorState<T, E, A>)
      );
      instance.replaceState(state, true, callbacks);
    }
  }

  abort(reason: R | undefined = undefined) {

    if (isFunction(this.currentAbort)) {
      this.currentAbort(reason);
    }
  }

  dispose() {
    if (this.locks && this.locks > 0) {
      return false;
    }

    this.willUpdate = true;
    this.abort();
    if (this.queue) {
      clearTimeout(this.queue.id);
      delete this.queue;
    }

    this.locks = 0;
    let initialState = this.config.initialValue;
    if (isFunction(initialState)) {
      initialState = initialState(this.cache);
    }
    const newState: State<T, E, R, A> = StateBuilder.initial<T, A>(initialState as T);
    this.replaceState(newState);
    if (__DEV__) devtools.emitDispose(this);

    this.willUpdate = false;
    invokeInstanceEvents(this, "dispose");
    return true;
  }

  fork(forkConfig?: ForkConfig) {
    if (!this.forksIndex) {
      this.forksIndex = 0;
    }
    const mergedConfig: ForkConfig = forkConfig || {};

    let {key} = mergedConfig;

    if (key === undefined) {
      key = `${this.key}-fork-${this.forksIndex + 1}`;
    }

    let clone = new AsyncState(key, this._producer, this.config);

    // if something fail, no need to increment
    this.forksIndex += 1;

    if (mergedConfig.keepState) {
      clone.state = shallowClone(this.state);
      clone.lastSuccess = shallowClone(this.lastSuccess);
    }
    if (mergedConfig.keepCache) {
      clone.cache = this.cache;
    }

    return clone as StateInterface<T, E, R, A>;
  }

  mergePayload(partialPayload?: Record<string, any>): void {
    if (!this.payload) {
      this.payload = {}
    }
    this.payload = Object.assign(this.payload, partialPayload);
  }

  replaceCache(cacheKey: string, cache: CachedState<T, E, R, A>): void {
    if (!isCacheEnabled(this)) {
      return;
    }
    const topLevelParent = getTopLevelParent(this);
    if (!topLevelParent.cache) {
      topLevelParent.cache = {};
    }
    topLevelParent.cache[cacheKey] = cache;
    spreadCacheChangeOnLanes(topLevelParent);
  }
}

//region AsyncState methods helpers
let uniqueId: number = 0;
let HYDRATION_DATA_KEY = "__ASYNC_STATES_HYDRATION_DATA__";

export let Sources: SourcesType = (function () {
  let output: Omit<Omit<SourcesType, "of">, "for"> = createSource;
  (output as SourcesType).of = getSource;
  (output as SourcesType).for = createSource;
  return output as SourcesType;
})();

function nextUniqueId() {
  return ++uniqueId;
}

function shallowClone(source1, source2?) {
  return Object.assign({}, source1, source2);
}

function makeSource<T, E, R, A extends unknown[]>(instance: StateInterface<T, E, R, A>): Readonly<Source<T, E, R, A>> {
  let hiddenInstance = hideStateInstanceInNewObject(instance);

  let source: Source<T, E, R, A> = Object.assign(hiddenInstance, {
    key: instance.key,
    uniqueId: instance.uniqueId,

    on: instance.on,
    run: instance.run,
    runp: instance.runp,
    runc: instance.runc,
    abort: instance.abort,
    replay: instance.replay,
    hasLane: instance.hasLane,
    getState: instance.getState,
    setState: instance.setState,
    getConfig: instance.getConfig,
    subscribe: instance.subscribe,
    getPayload: instance.getPayload,
    removeLane: instance.removeLane,
    getVersion: instance.getVersion,
    patchConfig: instance.patchConfig,
    mergePayload: instance.mergePayload,
    replaceCache: instance.replaceCache,
    invalidateCache: instance.invalidateCache,
    replaceProducer: instance.replaceProducer,

    getAllLanes() {
      if (!instance.lanes) {
        return [];
      }
      return Object.values(instance.lanes).map(lane => lane._source);
    },

    getLaneSource(lane?: string) {
      return instance.getLane(lane)._source;
    },
  });

  Object.defineProperty(source, sourceSymbol, {
    value: true,
    writable: false,
    enumerable: false,
    configurable: false,
  });

  return freeze(source);
}

export function createSource<T, E = unknown, R = unknown, A extends unknown[] = unknown[]>(
  props: string | CreateSourceObject<T, E, R, A>,
  maybeProducer?: Producer<T, E, R, A> | undefined | null,
  maybeConfig?: ProducerConfig<T, E, R, A>,
): Source<T, E, R, A> {
  if (typeof props === "object") {
    return new AsyncState(props.key, props.producer, props.config)._source;
  }
  return new AsyncState(props, maybeProducer, maybeConfig)._source;
}

export function getSource(key: string, poolName?: string, context?: unknown) {
  let executionContext = requestContext(context);
  let pool = executionContext.getOrCreatePool(poolName);
  return pool.instances.get(key)?._source;
}

export function readSource<T, E, R, A extends unknown[]>(possiblySource: Source<T, E, R, A>): StateInterface<T, E, R, A> {
  try {
    const candidate = possiblySource.constructor(asyncStatesKey);
    if (!(candidate instanceof AsyncState)) {
      throw new Error("");// error is thrown to trigger the catch block
    }
    return candidate; // async state instance
  } catch (e) {
    throw new Error("Incompatible Source object.");
  }
}

function notifySubscribers<T, E, R, A extends unknown[]>(instance: StateInterface<T, E, R, A>) {
  if (!instance.subscriptions) {
    return;
  }
  Object.values(instance.subscriptions).forEach(subscription => {
    subscription.props.cb(instance.state);
  });
}

function attemptHydratedState<T, E, R, A extends unknown[]>(
  poolName: string,
  key: string
): HydrationData<T, E, R, A> | null {
  // do not attempt hydration outside server
  if (isServer) {
    return null;
  }
  if (!maybeWindow || !maybeWindow[HYDRATION_DATA_KEY]) {
    return null;
  }

  let savedHydrationData = maybeWindow[HYDRATION_DATA_KEY];
  let name = `${poolName}__INSTANCE__${key}`;
  let maybeState = savedHydrationData[name];

  if (!maybeState) {
    return null;
  }

  delete savedHydrationData[name];
  if (Object.keys(savedHydrationData).length === 0) {
    delete maybeWindow[HYDRATION_DATA_KEY];
  }

  return maybeState as HydrationData<T, E, R, A>;
}

function invokeInstanceEvents<T, E, R, A extends unknown[]>(
  instance: StateInterface<T, E, R, A>, type: InstanceEventType) {
  let events = instance.events;
  if (!events || !events[type]) {
    return;
  }
  switch (type) {
    case "change": {
      Object.values(events[type]!).forEach(registeredEvents => {
        if (isArray(registeredEvents)) {
          registeredEvents.forEach(evt => {
            invokeSingleChangeEvent(instance.getState(), evt);
          });
        } else {
          invokeSingleChangeEvent(instance.getState(), registeredEvents);
        }
      });
      return;
    }
    case "dispose": {
      Object.values(events[type]!).forEach(registeredEvents => {
        if (isArray(registeredEvents)) {
          registeredEvents.forEach(evt => evt());
        } else {
          registeredEvents();
        }
      });
      return;
    }
    case "cache-change": {
      Object.values(events[type]!).forEach(registeredEvents => {
        if (isArray(registeredEvents)) {
          registeredEvents.forEach(evt => evt(instance.cache));
        } else {
          registeredEvents(instance.cache);
        }
      });
      return;
    }
  }
}

function invokeChangeCallbacks<T, E, R, A extends unknown[]>(
  state: State<T, E, R, A>,
  callbacks: ProducerCallbacks<T, E, R, A> | undefined
) {
  if (!callbacks) {
    return;
  }
  let {onError, onAborted, onSuccess} = callbacks;
  if (onSuccess && state.status === success) {
    onSuccess(state);
  }
  if (onAborted && state.status === aborted) {
    onAborted(state);
  }
  if (onError && state.status === error) {
    onError(state);
  }
}

function invokeSingleChangeEvent<T, E, R, A extends unknown[]>(
  state: State<T, E, R, A>,
  event: StateChangeEventHandler<T, E, R, A>
) {
  if (isFunction(event)) {
    event(state);
  } else if (typeof event === "object" && event.status === state.status) {
    event.handler(state);
  }
}

export function createProps<T, E, R, A extends unknown[]>(config: CreatePropsConfig<T, E, R, A>): ProducerProps<T, E, R, A> {
  let {
    context,
    args,
    payload,
    indicators,
    lastSuccess,
    getState,
    onEmit,
    onAborted,
    onCleared,
  } = config;
  let onAbortCallbacks: AbortFn[] = [];
  return {
    emit,
    args,
    abort,
    payload,
    getState,
    lastSuccess,
    onAbort(callback: AbortFn) {
      if (isFunction(callback)) {
        onAbortCallbacks.push(callback);
      }
    },
    isAborted() {
      return indicators.aborted;
    },
    run: runFunction.bind(null, context),
    runp: runpFunction.bind(null, context),
    select: selectFunction.bind(null, context),
  };

  function emit(
    updater: T | StateFunctionUpdater<T, E, R, A>, status?: Status): void {
    let state = getState();
    if (indicators.cleared && state.status === aborted) {
      if (__DEV__) {
        console.error("You are emitting while your producer is passing to aborted state." +
          "This has no effect and not supported by the library. The next " +
          "state value on aborted state is the reason of the abort.");
      }
      return;
    }
    if (!indicators.done) {
      if (__DEV__) {
        console.error("Called props.emit before the producer resolves. This is" +
          " not supported in the library and will have no effect");
      }
      return;
    }
    onEmit(updater, status);
  }

  function abort(reason?: R): AbortFn<R> | undefined {
    if (indicators.aborted || indicators.cleared) {
      return;
    }

    if (!indicators.done) {
      indicators.aborted = true;
      // in case we will be running right next, there is no need to step in the
      // aborted state since we'll be immediately (sync) later in pending again, so
      // we bail out this aborted state update.
      // this is to distinguish between aborts that are called from the wild
      // from aborts that will be called synchronously
      // by the library replace the state again
      // these state updates are only with aborted status
      onAborted(reason);
    }

    indicators.cleared = true; // before calling user land onAbort that may emit
    onAbortCallbacks.forEach(function clean(func) {
      if (isFunction(func)) {
        func(reason);
      }
    });
    onCleared();
    // instance.currentAbort = undefined;
  }

}

function getTopLevelParent<T, E, R, A extends unknown[]>(base: StateInterface<T, E, R, A>): StateInterface<T, E, R, A> {
  let current = base;
  while (current.parent) {
    current = current.parent;
  }
  return current;
}

function spreadCacheChangeOnLanes<T, E, R, A extends unknown[]>(topLevelParent: StateInterface<T, E, R, A>) {
  invokeInstanceEvents(topLevelParent, "cache-change");
  if (!topLevelParent.lanes) {
    return;
  }
  Object.values(topLevelParent.lanes)
    .forEach(lane => {
      lane.cache = topLevelParent.cache;
      spreadCacheChangeOnLanes(lane);
    });
}

function isCacheEnabled<T, E, R, A extends unknown[]>(instance: StateInterface<T, E, R, A>): boolean {
  return !!instance.config.cacheConfig?.enabled;
}

function loadCache<T, E, R, A extends unknown[]>(instance: StateInterface<T, E, R, A>) {
  if (
    !isCacheEnabled(instance) ||
    !isFunction(instance.config.cacheConfig?.load)
  ) {
    return;
  }

  // inherit cache from the parent if exists!
  if (instance.parent) {
    let topLevelParent: StateInterface<T, E, R, A> = getTopLevelParent(instance);
    instance.cache = topLevelParent.cache;
    return;
  }

  let loadedCache = instance.config.cacheConfig!.load();

  if (!loadedCache) {
    return;
  }

  if (isPromise(loadedCache)) {
    waitForAsyncCache(instance, loadedCache as Promise<Record<string, CachedState<T, E, R, A>>>);
  } else {
    resolveCache(instance, loadedCache as Record<string, CachedState<T, E, R, A>>);
  }
}

function getStateDeadline<T, E, R, A extends unknown[]>(
  state: SuccessState<T, A>,
  getDeadline?: (currentState: State<T, E, R, A>) => number
) {
  let {data} = state;
  let deadline = Infinity;
  if (!getDeadline && data && hasHeadersSet((data as any).headers)) {
    let maybeMaxAge = readCacheControlMaxAgeHeader((data as any).headers);
    if (maybeMaxAge && maybeMaxAge > 0) {
      deadline = maybeMaxAge;
    }
  }
  if (isFunction(getDeadline)) {
    deadline = getDeadline(state);
  }
  return deadline;
}

// https://stackoverflow.com/a/60154883/7104283
function readCacheControlMaxAgeHeader(headers: Headers): number | undefined {
  let cacheControl = headers.get('cache-control');
  if (cacheControl) {
    let matches = cacheControl.match(/max-age=(\d+)/);
    return matches ? parseInt(matches[1], 10) : undefined;
  }
}

// from remix
export function hasHeadersSet(headers: any): headers is Headers {
  return (headers && isFunction(headers.get));
}

function saveCacheAfterSuccessfulUpdate<T, E, R, A extends unknown[]>(instance: StateInterface<T, E, R, A>) {
  let topLevelParent: StateInterface<T, E, R, A> = getTopLevelParent(instance);
  let {config: {cacheConfig}} = topLevelParent;
  let state = instance.state as SuccessState<T, A>;
  let {props} = state;

  if (!topLevelParent.cache) {
    topLevelParent.cache = {};
  }

  let hashFunction = cacheConfig && cacheConfig.hash || defaultHash;
  let runHash = hashFunction(props?.args, props?.payload);

  if (topLevelParent.cache[runHash]?.state !== state) {
    let deadline = getStateDeadline(state, cacheConfig?.getDeadline)
    topLevelParent.cache[runHash] = {
      deadline,
      state: state,
      addedAt: Date.now(),
    };

    if (
      topLevelParent.config.cacheConfig &&
      isFunction(topLevelParent.config.cacheConfig.persist)) {
      topLevelParent.config.cacheConfig.persist(topLevelParent.cache);
    }

    spreadCacheChangeOnLanes(topLevelParent);
  }
}

function attemptCache<T, E, R, A extends unknown[]>(
  instance: StateInterface<T, E, R, A>,
  payload,
  runProps?: RUNCProps<T, E, R, A>
): boolean {
  if (isCacheEnabled(instance)) {
    let args = (runProps && runProps.args || emptyArray) as A;
    let topLevelParent: StateInterface<T, E, R, A> = getTopLevelParent(instance);

    let {cacheConfig} = instance.config;
    let hashFunction = cacheConfig && cacheConfig.hash || defaultHash;

    let runHash = hashFunction(args, payload);
    let cachedState = topLevelParent.cache?.[runHash];

    if (cachedState) {
      if (didNotExpire(cachedState)) {
        if (cachedState.state !== instance.state) {
          instance.replaceState(cachedState.state, true, runProps);
        }
        if (__DEV__) devtools.emitRunConsumedFromCache(instance, payload, args);
        return true;
      } else {
        delete topLevelParent.cache![runHash];

        if (
          topLevelParent.cache &&
          isFunction(topLevelParent.config.cacheConfig?.persist)
        ) {
          topLevelParent.config.cacheConfig!.persist(topLevelParent.cache);
        }
        spreadCacheChangeOnLanes(topLevelParent);
      }
    }
  }
  return false;
}

function waitForAsyncCache<T, E, R, A extends unknown[]>(
  instance: StateInterface<T, E, R, A>,
  promise: Promise<Record<string, CachedState<T, E, R, A>>>
) {
  promise.then(asyncCache => {
    resolveCache(instance, asyncCache);
  })
}

function resolveCache<T, E, R, A extends unknown[]>(
  instance: StateInterface<T, E, R, A>,
  resolvedCache: Record<string, CachedState<T, E, R, A>>
) {
  instance.cache = resolvedCache;
  const cacheConfig = instance.config.cacheConfig;

  if (isFunction(cacheConfig!.onCacheLoad)) {
    cacheConfig!.onCacheLoad({
      cache: instance.cache,
      setState: instance.setState
    });
  }
}

function scheduleDelayedPendingUpdate<T, E, R, A extends unknown[]>(
  instance: AsyncState<T, E, R, A>,
  newState: State<T, E, R, A>,
  notify: boolean
) {
  function callback() {
    // callback always sets the state with a pending status
    if (__DEV__) devtools.startUpdate(instance);
    let clonedState = shallowClone(newState);
    clonedState.timestamp = Date.now();
    instance.state = freeze(clonedState); // <-- status is pending!
    instance.pendingUpdate = null;
    instance.version += 1;
    invokeInstanceEvents(instance, "change");
    if (__DEV__) devtools.emitUpdate(instance);

    if (notify) {
      notifySubscribers(instance as StateInterface<T, E, R, A>);
    }
  }

  let timeoutId = setTimeout(callback, instance.config.skipPendingDelayMs);
  instance.pendingUpdate = {callback, timeoutId};
}

//endregion

//region producerEffects
function runFunction<T, E, R, A extends unknown[]>(
  context: LibraryPoolsContext,
  input: ProducerRunInput<T, E, R, A>,
  config: ProducerRunConfig | null,
  ...args: A
) {
  if (isSource(input)) {
    return input.getLaneSource(config?.lane).run.apply(null, args);
  } else if (isFunction(input)) {
    let instance = new AsyncState(
      nextKey(), input, {
        hideFromDevtools: true,
        context: context.context
      });
    if (config?.payload) {
      instance.mergePayload(config.payload)
    }
    return instance.run.apply(null, args);
  } else {
    let instance = context.getOrCreatePool(config?.pool).instances.get(input);

    if (instance) {
      return instance.getLane(config?.lane).run.apply(null, args);
    }
  }
  return undefined;
}

function runpFunction<T, E, R, A extends unknown[]>(
  context: LibraryPoolsContext,
  input: ProducerRunInput<T, E, R, A>,
  config: ProducerRunConfig | null,
  ...args: A
) {
  if (isSource(input)) {
    return input.getLaneSource(config?.lane).runp.apply(null, args);
  } else if (isFunction(input)) {

    let instance = new AsyncState(nextKey(),
      input, {
        hideFromDevtools: true,
        context: context.context
      });
    if (config?.payload) {
      instance.mergePayload(config.payload);
    }
    return instance.runp.apply(null, args);

  } else {
    let instance = context.getOrCreatePool().instances.get(input);
    if (instance) {
      return instance.getLane(config?.lane).runp.apply(null, args);
    }
  }
  return undefined;
}

function selectFunction<T, E, R, A extends unknown[]>(
  context: LibraryPoolsContext,
  input: ProducerRunInput<T, E, R, A>,
  lane?: string,
) {
  if (isSource(input)) {
    return (input as Source<T, E, R, A>).getLaneSource(lane).getState()
  } else if (typeof input === "string") {
    let pool = context.getOrCreatePool();
    let instance = pool.instances.get(input);
    if (instance) {
      return instance.getState();
    }
  }
}

//endregion

//region UPDATE QUEUE
function getQueueTail<T, E, R, A extends unknown[]>(instance: StateInterface<T, E, R, A>): UpdateQueue<T, E, R, A> | null {
  if (!instance.queue) {
    return null;
  }
  let current = instance.queue;
  while (current.next !== null) {
    current = current.next;
  }
  return current;
}

function enqueueUpdate<T, E, R, A extends unknown[]>(
  instance: StateInterface<T, E, R, A>,
  newState: State<T, E, R, A>,
  callbacks?: ProducerCallbacks<T, E, R, A>
) {
  let update: UpdateQueue<T, E, R, A> = {
    callbacks,
    data: newState,
    kind: 0,
    next: null,
  };
  if (!instance.queue) {
    instance.queue = update;
  } else {
    let tail = getQueueTail(instance);
    if (!tail) {
      return;
    }
    tail.next = update;
  }

  ensureQueueIsScheduled(instance);
}

function enqueueSetState<T, E, R, A extends unknown[]>(
  instance: StateInterface<T, E, R, A>,
  newValue: T | StateFunctionUpdater<T, E, R, A>,
  status = success,
  callbacks?: ProducerCallbacks<T, E, R, A>,
) {
  let update: UpdateQueue<T, E, R, A> = {
    callbacks,
    kind: 1,
    data: {data: newValue, status},
    next: null,
  };
  if (!instance.queue) {
    instance.queue = update;
  } else {
    let tail = getQueueTail(instance);
    if (!tail) {
      return;
    }
    tail.next = update;
  }

  ensureQueueIsScheduled(instance);
}

function ensureQueueIsScheduled<T, E, R, A extends unknown[]>(
  instance: StateInterface<T, E, R, A>
) {
  if (!instance.queue) {
    return;
  }
  let queue: UpdateQueue<T, E, R, A> = instance.queue;
  if (queue.id) {
    return;
  }
  let delay = instance.config.keepPendingForMs || 0;
  let elapsedTime = Date.now() - instance.state.timestamp;
  let remainingTime = delay - elapsedTime;

  if (remainingTime > 0) {
    queue.id = setTimeout(() => flushUpdateQueue(instance), remainingTime);
  } else {
    flushUpdateQueue(instance);
  }
}

function flushUpdateQueue<T, E, R, A extends unknown[]>(
  instance: StateInterface<T, E, R, A>,
) {

  if (!instance.queue) {
    return;
  }

  let current: UpdateQueue<T, E, R, A> | null = instance.queue;

  delete instance.queue;

  instance.flushing = true;
  while (current !== null) {
    let {data: {status}, callbacks} = current;
    let canBailoutPendingStatus = status === pending && current.next !== null;

    if (canBailoutPendingStatus) {
      current = current.next;
    } else {
      if (current.kind === 0) {
        instance.replaceState(current.data, undefined, callbacks);
      }
      if (current.kind === 1) {
        let {data: {data, status}} = current;
        instance.setState(data, status, callbacks);
      }
      current = current.next;
    }
  }
  delete instance.flushing;
  notifySubscribers(instance);
}

//endregion
