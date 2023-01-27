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
  AbortedState,
  AbortFn,
  AsyncStateSubscribeProps,
  CachedState,
  CreateSourceObject, ErrorState,
  ForkConfig,
  HydrationData,
  InitialState,
  InstanceCacheChangeEvent,
  InstanceCacheChangeEventHandlerType,
  InstanceChangeEvent,
  InstanceChangeEventHandlerType,
  InstanceDisposeEvent,
  InstanceDisposeEventHandlerType,
  InstanceEventHandlerType,
  InstanceEvents,
  InstanceEventType,
  LibraryPoolsContext, PendingState,
  PendingTimeout,
  PendingUpdate,
  PoolInterface,
  Producer,
  ProducerCallbacks,
  ProducerConfig,
  ProducerEffects,
  ProducerFunction,
  ProducerProps,
  ProducerRunConfig,
  ProducerRunInput,
  RUNCProps,
  RunIndicators,
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
import {producerWrapper} from "./wrapper";
import {isSource, sourceSymbol} from "./helpers/isSource";
import {StateBuilder} from "./helpers/StateBuilder";
import {freeze, isArray} from "./helpers/corejs";

export class AsyncState<T, E, R> implements StateInterface<T, E, R> {
  //region properties
  key: string;
  uniqueId: number;
  version: number = 0;
  _source: Source<T, E, R>;
  config: ProducerConfig<T, E, R>;

  state: State<T, E, R>;
  lastSuccess: SuccessState<T> | InitialState<T>;
  events?: InstanceEvents<T, E, R>;
  eventsIndex?: number;
  queue?: UpdateQueue<T, E, R>;
  flushing?: boolean;

  _producer: Producer<T, E, R> | undefined;

  //
  payload?: Record<string, any>;
  journal?: any[];
  cache?: Record<string, CachedState<T, E, R>>;
  forksIndex?: number;
  parent?: StateInterface<T, E, R> | null;
  lanes?: Record<string, StateInterface<T, E, R>> | null;
  subsIndex?: number;
  subscriptions?: Record<number, StateSubscription<T, E, R>> | null;
  suspender?: Promise<T>;
  pendingUpdate?: PendingUpdate | null;
  private pendingTimeout?: PendingTimeout | null;
  latestRun?: RunTask<T, E, R> | null;
  willUpdate?: boolean;
  currentAbort?: AbortFn;
  private locks?: number;
  isEmitting?: boolean;

  readonly producer: ProducerFunction<T, E, R>;
  readonly pool: PoolInterface;


  //endregion

  constructor(
    key: string,
    producer: Producer<T, E, R> | undefined | null,
    config?: ProducerConfig<T, E, R>,
    poolName?: string,
  ) {

    let executionContext = requestContext(config?.context);
    let {poolInUse, getOrCreatePool} = executionContext;

    let poolToUse: PoolInterface = poolInUse;
    if (poolName) {
      poolToUse = getOrCreatePool(poolName);
    }

    let maybeInstance = poolToUse.instances.get(key);
    if (maybeInstance) {
      if (__DEV__) {
        warnAboutAlreadyExistingSourceWithSameKey(key);
      }

      let instance = maybeInstance as AsyncState<T, E, R>;
      instance.replaceProducer(producer || undefined);
      instance.patchConfig(config);
      return instance;
    }

    this.key = key;
    this.pool = poolToUse;
    this.uniqueId = nextUniqueId();
    this.config = shallowClone(config);
    this._producer = producer ?? undefined;

    if (__DEV__) {
      this.journal = [];
    }

    loadCache(this);

    let maybeHydratedState = attemptHydratedState<T, E, R>(this.pool.name, this.key);

    if (maybeHydratedState) {
      this.state = maybeHydratedState.state;
      this.payload = maybeHydratedState.payload;
      this.latestRun = maybeHydratedState.latestRun;

      if (this.state.status === success) {
        this.lastSuccess = this.state;
      } else {
        let initializer = this.config.initialValue;
        let initialStateValue = isFunction(initializer) ?
          (initializer as Function).call(null, this.cache) : initializer;
        this.lastSuccess = StateBuilder.initial(initialStateValue);
      }
    } else {
      let initializer = this.config.initialValue;
      let initialStateValue = isFunction(initializer) ?
        (initializer as Function).call(null, this.cache) : initializer;
      this.state = StateBuilder.initial(initialStateValue);
      this.lastSuccess = this.state;
    }


    this.bindMethods();

    let instance = this;
    this.producer = producerWrapper.bind(null, {
      setState: instance.setState,
      instance: instance,
      setSuspender: (suspender: Promise<T>) => instance.suspender = suspender,
      replaceState: instance.replaceState.bind(instance),
      getProducer: () => instance._producer,
    });

    this._source = makeSource(this);

    if (__DEV__) {
      devtools.emitCreation(this);
    }

    poolToUse.set(key, this);
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

  getState(): State<T, E, R> {
    return this.state;
  }

  getConfig(): ProducerConfig<T, E, R> {
    return this.config;
  }

  on(
    eventType: InstanceChangeEvent,
    eventHandler: InstanceChangeEventHandlerType<T, E, R>
  ): (() => void)
  on(
    eventType: InstanceDisposeEvent,
    eventHandler: InstanceDisposeEventHandlerType<T, E, R>
  ): (() => void)
  on(
    eventType: InstanceCacheChangeEvent,
    eventHandler: InstanceCacheChangeEventHandlerType<T, E, R>
  ): (() => void)
  on(
    eventType: InstanceEventType,
    eventHandler: InstanceEventHandlerType<T, E, R>
  ): (() => void) {
    if (!this.events) {
      this.events = {} as InstanceEvents<T, E, R>;
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

  patchConfig(partialConfig?: Partial<ProducerConfig<T, E, R>>) {
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

  getLane(laneKey?: string): StateInterface<T, E, R> {
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
    newState: State<T, E, R>,
    notify: boolean = true,
    callbacks?: ProducerCallbacks<T, E, R>
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
      this.suspender = undefined;
    }

    if (notify && !this.flushing) {
      notifySubscribers(this as StateInterface<any>);
    }
  }

  subscribe(cb: (s: State<T, E, R>) => void): AbortFn
  subscribe(subProps: AsyncStateSubscribeProps<T, E, R>): AbortFn
  subscribe(argv: ((s: State<T, E, R>) => void) | AsyncStateSubscribeProps<T, E, R>): AbortFn {
    let props = (isFunction(argv) ? {cb: argv} : argv) as AsyncStateSubscribeProps<T, E, R>;
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

  setState(newValue: T | StateFunctionUpdater<T, E, R>, status: Status = success, callbacks?: ProducerCallbacks<T, E, R>): void {
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
      effectiveValue = (newValue as StateFunctionUpdater<T, E, R>)(this.state);
    }
    const savedProps = cloneProducerProps<T, E, R>({
      args: [effectiveValue],
      payload: shallowClone(this.payload),
    });
    if (__DEV__) devtools.emitReplaceState(this, savedProps);
    // @ts-ignore
    let newState = StateBuilder[status](effectiveValue, savedProps) as State<T, E, R>;
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

  replaceProducer(newProducer: Producer<T, E, R> | undefined) {
    this._producer = newProducer;
  }

  invalidateCache(cacheKey?: string) {
    if (isCacheEnabled(this)) {
      const topLevelParent: StateInterface<T, E, R> = getTopLevelParent(this);

      if (!cacheKey) {
        topLevelParent.cache = {};
      } else if (topLevelParent.cache) {
        delete topLevelParent.cache[cacheKey];
      }

      if (
        topLevelParent.cache &&
        isFunction(topLevelParent.config.cacheConfig?.persist)
      ) {
        topLevelParent.config.cacheConfig!.persist!(topLevelParent.cache);
      }

      spreadCacheChangeOnLanes(topLevelParent);
    }
  }

  run(...args: any[]) {
    return this.runc({args});
  }

  runp(...args: any[]) {
    let instance = this;
    return new Promise<State<T, E, R>>(function runpPromise(resolve) {
      instance.runc({
        args,
        onError: resolve,
        onSuccess: resolve,
        onAborted: resolve
      });
    });
  }

  runc(props?: RUNCProps<T, E, R>) {
    let effectDurationMs = Number(this.config.runEffectDurationMs) || 0;
    let runNow = !isFunction(setTimeout) || !this.config.runEffect || effectDurationMs === 0;

    if (runNow) {
      return this.runImmediately(shallowClone(this.payload), props);
    }
    return this.runWithEffect(props);
  }

  private runWithEffect(props?: RUNCProps<T, E, R>): AbortFn {
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
          abortCallback!(reason);
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
    payload: Record<string, any> | null,
    runProps?: RUNCProps<T, E, R>,
  ): AbortFn {
    let instance = this;

    instance.willUpdate = true;
    let execArgs = runProps?.args || emptyArray;

    if (instance.state.status === pending || instance.pendingUpdate) {
      if (this.pendingUpdate) {
        clearTimeout(this.pendingUpdate.timeoutId);
        this.pendingUpdate = null;
      }
      this.abort();
      this.currentAbort = undefined;
    } else if (isFunction(this.currentAbort)) {
      this.abort();
    }

    if (isCacheEnabled(this)) {
      let topLevelParent: StateInterface<T, E, R> = getTopLevelParent(this);

      let {cacheConfig} = this.config;

      let hashFunction = cacheConfig && cacheConfig.hash || defaultHash;

      let runHash = hashFunction(execArgs, payload);
      let cachedState = topLevelParent.cache?.[runHash];

      if (cachedState) {
        if (didNotExpire(cachedState)) {
          if (cachedState.state !== this.state) {
            this.replaceState(cachedState.state, true, runProps);
          }
          if (__DEV__) devtools.emitRunConsumedFromCache(this, payload, execArgs);
          return;
        } else {
          delete topLevelParent.cache![runHash];

          if (
            topLevelParent.cache &&
            isFunction(topLevelParent.config.cacheConfig?.persist)
          ) {
            topLevelParent.config.cacheConfig!.persist!(topLevelParent.cache);
          }
          spreadCacheChangeOnLanes(topLevelParent);
        }
      }
    }

    const runIndicators = {
      cleared: false, // abort was called and abort callbacks were removed
      aborted: false, // aborted before fulfillment
      fulfilled: false, // resolved to something, either success or error
    };

    this.latestRun = {payload, args: execArgs};

    let callbacks: ProducerCallbacks<T, E, R> | undefined = undefined;
    if (runProps) {
      callbacks = {
        onError: runProps.onError,
        onSuccess: runProps.onSuccess,
        onAborted: runProps.onAborted,
      };
    }

    const props = constructPropsObject(this, callbacks, runIndicators, payload, execArgs);

    const abort = props.abort;
    this.currentAbort = abort;
    this.producer(props, runIndicators, callbacks);

    this.willUpdate = false;

    return abort;
  }

  abort(reason: any = undefined) {
    if (isFunction(this.currentAbort)) {
      this.currentAbort!(reason);
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
      let initializer = initialState as ((cache?: Record<string, CachedState<T, E, R>>) => T);
      initialState = initializer(this.cache);
    }
    const newState: State<T, E, R> = StateBuilder.initial<T>(initialState as T);
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

    const clone = new AsyncState(key, this._producer, this.config, this.pool.simpleName);

    // if something fail, no need to increment
    this.forksIndex += 1;

    if (mergedConfig.keepState) {
      clone.state = shallowClone(this.state);
      clone.lastSuccess = shallowClone(this.lastSuccess);
    }
    if (mergedConfig.keepCache) {
      clone.cache = this.cache;
    }

    return clone as StateInterface<T, E, R>;
  }

  mergePayload(partialPayload?: Record<string, any>): void {
    if (!this.payload) {
      this.payload = {}
    }
    this.payload = Object.assign(this.payload, partialPayload);
  }

  replaceCache(cacheKey: string, cache: CachedState<T, E, R>): void {
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

function invokeChangeCallbacks<T, E, R>(
  state: State<T, E, R>,
  callbacks: ProducerCallbacks<T, E, R> | undefined
) {
  if (!callbacks) {
    return;
  }
  let {onError, onAborted, onSuccess}  = callbacks;
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

export function shallowClone(
  source1,
  source2?
) {
  return Object.assign({}, source1, source2);
}

export function attemptHydratedState<T, E, R>(
  poolName: string, key: string): HydrationData<T, E, R> | null {
  // do not attempt hydration outside server
  if (isServer) {
    return null;
  }
  if (!maybeWindow || !maybeWindow.__ASYNC_STATES_HYDRATION_DATA__) {
    return null;
  }

  let savedHydrationData = maybeWindow.__ASYNC_STATES_HYDRATION_DATA__;
  let name = `${poolName}__INSTANCE__${key}`;
  let maybeState = savedHydrationData[name];

  if (!maybeState) {
    return null;
  }

  delete savedHydrationData[name];
  if (Object.keys(savedHydrationData).length === 0) {
    delete maybeWindow.__ASYNC_STATES_HYDRATION_DATA__;
  }

  return maybeState as HydrationData<T, E, R>;
}
function invokeSingleChangeEvent<T, E, R>(
  state: State<T, E, R>,
  event: StateChangeEventHandler<T, E, R>
) {
  if (isFunction(event)) {
    (event as ((newState: State<T, E, R>) => void))(state);
  } else if (typeof event === "object" && event.status === state.status) {
    event.handler(state);
  }
}

function invokeInstanceEvents<T, E, R>(
  instance: StateInterface<T, E, R>, type: InstanceEventType) {
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

function constructPropsObject<T, E, R>(
  instance: StateInterface<T, E, R>,
  callbacks: ProducerCallbacks<T, E, R> | undefined,
  runIndicators: RunIndicators,
  payload: Record<string, any> | null,
  args: any[]
): ProducerProps<T, E, R> {
  let context: LibraryPoolsContext = instance.pool.context;

  let onAbortCallbacks: AbortFn[] = [];
  // @ts-ignore
  let props: ProducerProps<T> = {
    emit,
    args,
    abort,
    payload,
    // todo: lastSuccess is error prone, since emit stays alive and may read a wrong result from here
    // but has low priority since getState returns the very current state
    lastSuccess: instance.lastSuccess,
    onAbort(cb: AbortFn) {
      if (isFunction(cb)) {
        onAbortCallbacks.push(cb);
      }
    },
    isAborted() {
      return runIndicators.aborted;
    },
    getState() {
      return instance.state;
    }
  };
  Object.assign(props, effectsCreator(props, context.context));

  return props;


  function emit(
    updater: T | StateFunctionUpdater<T, E, R>,
    status?: Status
  ): void {
    if (runIndicators.cleared && instance.state.status === aborted) {
      if (__DEV__) {
        console.error("You are emitting while your producer is passing to aborted state." +
          "This has no effect and not supported by the library. The next " +
          "state value on aborted state is the reason of the abort.");
      }
      return;
    }
    if (!runIndicators.fulfilled) {
      if (__DEV__) {
        console.error("Called props.emit before the producer resolves. This is" +
          " not supported in the library and will have no effect");
      }
      return;
    }
    instance.isEmitting = true;
    instance.setState(updater, status, callbacks);
    instance.isEmitting = false;
  }

  function abort(reason: any): AbortFn | undefined {
    if (runIndicators.aborted || runIndicators.cleared) {
      return;
    }

    if (!runIndicators.fulfilled) {
      runIndicators.aborted = true;
      // in case we will be running right next, there is no need to step in the
      // aborted state since we'll be immediately (sync) later in pending again, so
      // we bail out this aborted state update.
      // this is to distinguish between aborts that are called from the wild
      // from aborts that will be called synchronously
      // by the library replace the state again
      // these state updates are only with aborted status
      if (!instance.willUpdate) {
        let abortedState = StateBuilder.aborted<T, E, R>(reason, cloneProducerProps(props));
        instance.replaceState(abortedState, true, callbacks);
      }
    }

    runIndicators.cleared = true;
    onAbortCallbacks.forEach(function clean(func) {

      if (isFunction(func)) {
        func!(reason);
      }
    });
    instance.currentAbort = undefined;
  }
}

export function createSource<T, E = any, R = any>(
  props: string | CreateSourceObject<T, E, R>,
  maybeProducer?: Producer<T, E, R> | undefined | null,
  maybeConfig?: ProducerConfig<T, E, R>,
): Source<T, E, R> {
  if (typeof props === "object") {
    let config = props.config;
    let pool = config && config.pool;
    return new AsyncState(props.key, props.producer, config, pool)._source;
  }
  let pool = maybeConfig && maybeConfig.pool;
  return new AsyncState(props, maybeProducer, maybeConfig, pool)._source;
}

export function getSource(key: string, poolName?: string, context?: any) {
  let executionContext = requestContext(context);
  let pool = executionContext.getOrCreatePool(poolName);
  return pool.instances.get(key)?._source;
}

export let Sources: SourcesType = (function () {
  let output: Omit<Omit<SourcesType, "of">, "for"> = createSource;
  (output as SourcesType).of = getSource;
  (output as SourcesType).for = createSource;
  return output as SourcesType;
})();

let uniqueId: number = 0;

function nextUniqueId() {
  return ++uniqueId;
}

export function readSource<T, E, R>(possiblySource: Source<T, E, R>): StateInterface<T, E, R> {
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

function waitForAsyncCache<T, E, R>(
  instance: StateInterface<T, E, R>,
  promise: Promise<Record<string, CachedState<T, E, R>>>
) {
  promise.then(asyncCache => {
    resolveCache(instance, asyncCache);
  })
}

function resolveCache<T, E, R>(
  instance: StateInterface<T, E, R>,
  resolvedCache: Record<string, CachedState<T, E, R>>
) {
  instance.cache = resolvedCache;
  const cacheConfig = instance.config.cacheConfig;

  if (isFunction(cacheConfig!.onCacheLoad)) {
    cacheConfig!.onCacheLoad!({
      cache: instance.cache,
      setState: instance.setState
    });
  }
}

function scheduleDelayedPendingUpdate<T, E, R>(
  instance: AsyncState<T, E, R>,
  newState: State<T, E, R>,
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
      notifySubscribers(instance as StateInterface<T, E, R>);
    }
  }

  let timeoutId = setTimeout(callback, instance.config.skipPendingDelayMs);
  instance.pendingUpdate = {callback, timeoutId};
}

function getStateDeadline<T, E, R>(
  state: SuccessState<T>,
  getDeadline?: (currentState: State<T, E, R>) => number
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
    deadline = getDeadline!(state);
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

function saveCacheAfterSuccessfulUpdate<T, E, R>(instance: StateInterface<T, E, R>) {
  let topLevelParent: StateInterface<T, E, R> = getTopLevelParent(instance);
  let {config: {cacheConfig}} = topLevelParent;
  let state = instance.state as SuccessState<T>;
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
      topLevelParent.config.cacheConfig.persist!(topLevelParent.cache);
    }

    spreadCacheChangeOnLanes(topLevelParent);
  }
}

function loadCache<T, E, R>(instance: StateInterface<T, E, R>) {
  if (
    !isCacheEnabled(instance) ||
    !isFunction(instance.config.cacheConfig?.load)
  ) {
    return;
  }

  // inherit cache from the parent if exists!
  if (instance.parent) {
    let topLevelParent: StateInterface<T, E, R> = getTopLevelParent(instance);
    instance.cache = topLevelParent.cache;
    return;
  }

  let loadedCache = instance.config.cacheConfig!.load!();

  if (!loadedCache) {
    return;
  }

  if (isPromise(loadedCache)) {
    waitForAsyncCache(instance, loadedCache as Promise<Record<string, CachedState<T, E, R>>>);
  } else {
    resolveCache(instance, loadedCache as Record<string, CachedState<T, E, R>>);
  }
}

function notifySubscribers(instance: StateInterface<any>) {
  if (!instance.subscriptions) {
    return;
  }
  Object.values(instance.subscriptions).forEach(subscription => {
    subscription.props.cb(instance.state);
  });
}

function getTopLevelParent<T, E, R>(base: StateInterface<T, E, R>): StateInterface<T, E, R> {
  let current = base;
  while (current.parent) {
    current = current.parent;
  }
  return current;
}

function spreadCacheChangeOnLanes<T, E, R>(topLevelParent: StateInterface<T, E, R>) {
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

function makeSource<T, E, R>(instance: StateInterface<T, E, R>): Readonly<Source<T, E, R>> {
  let hiddenInstance = hideStateInstanceInNewObject(instance);

  let source: Source<T, E, R> = Object.assign(hiddenInstance, {
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

function isCacheEnabled(instance: StateInterface<any>): boolean {
  return !!instance.config.cacheConfig?.enabled;
}

//endregion

//region producerEffects creators helpers
function createRunFunction(context: LibraryPoolsContext) {
  return function runEffectFunction<T, E, R>(
    input: ProducerRunInput<T, E, R>,
    config: ProducerRunConfig | null,
    ...args: any[]
  ) {
    if (isSource(input)) {
      return (input as Source<T, E, R>).getLaneSource(config?.lane).run(...args);
    } else if (isFunction(input)) {
      let instance = new AsyncState(
        nextKey(), input as Producer<T, E, R>, {
          hideFromDevtools: true,
          context: context.context
        });
      if (config?.payload) {
        instance.mergePayload(config.payload)
      }
      return instance.run(...args);
    } else if (typeof input === "string") {
      let instance = context.getOrCreatePool(config?.pool).instances.get(input);

      if (instance) {
        return instance.getLane(config?.lane).run(...args);
      }
    }
    return undefined;
  }
}

function runpEffectFunction<T, E, R>(
  context: LibraryPoolsContext,
  props: ProducerProps<T, E, R>,
  input: ProducerRunInput<T, E, R>,
  config: ProducerRunConfig | null,
  ...args: any[]
) {
  if (isSource(input)) {
    let instance = readSource(input as Source<T, E, R>).getLane(config?.lane);
    return runWhileSubscribingToNextResolve(instance, props, args);
  } else if (isFunction(input)) {

    let instance = new AsyncState(nextKey(),
      input as Producer<T, E, R>, {
        hideFromDevtools: true,
        context: context.context
      });
    if (config?.payload) {
      instance.mergePayload(config.payload);
    }
    return runWhileSubscribingToNextResolve(instance, props, args);

  } else if (typeof input === "string") {
    let instance = context.getOrCreatePool().instances.get(input);
    if (instance) {
      return runWhileSubscribingToNextResolve(instance.getLane(config?.lane), props, args);
    }
  }
  return undefined;
}

function runWhileSubscribingToNextResolve<T, E, R>(
  instance: StateInterface<T, E, R>,
  props: ProducerProps<T, E, R>,
  args
): Promise<State<T, E, R>> {
  return new Promise(resolve => {
    let unsubscribe = instance.subscribe({cb: subscription});
    props.onAbort(unsubscribe);

    let abort = instance.run(...args);
    props.onAbort(abort);

    function subscription(newState: State<T, E, R>) {
      if (newState.status === success
        || newState.status === error) {
        if (isFunction(unsubscribe)) {
          unsubscribe!();
        }
        resolve(newState);
      }
    }
  });
}

function createSelectFunction(context: LibraryPoolsContext) {
  return function selectEffectFunction<T, E, R>(
    input: ProducerRunInput<T, E, R>,
    lane?: string,
  ) {
    if (isSource(input)) {
      return (input as Source<T, E, R>).getLaneSource(lane).getState()
    } else if (typeof input === "string") {
      let pool = context.getOrCreatePool();
      let instance = pool.instances.get(input);
      if (instance) {
        return instance.getState();
      }
    }
  }
}

export function effectsCreator<T, E, R>(
  props: ProducerProps<T, E, R>,
  context?: any
): ProducerEffects {
  let executionContext = requestContext(context);
  return {
    run: createRunFunction(executionContext),
    select: createSelectFunction(executionContext),
    runp: runpEffectFunction.bind(null, executionContext, props),
  };
}

//endregion

//region UPDATE QUEUE
function getQueueTail<T, E, R>(instance: StateInterface<T, E, R>): UpdateQueue<T, E, R> | null {
  if (!instance.queue) {
    return null;
  }
  let current = instance.queue;
  while (current.next !== null) {
    current = current.next;
  }
  return current;
}

export function enqueueUpdate<T, E, R>(
  instance: StateInterface<T, E, R>,
  newState: State<T, E, R>,
  callbacks?: ProducerCallbacks<T, E, R>
) {
  let update: UpdateQueue<T, E, R> = {
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

export function enqueueSetState<T, E, R>(
  instance: StateInterface<T, E, R>,
  newValue: T | StateFunctionUpdater<T, E, R>,
  status = success,
  callbacks?: ProducerCallbacks<T, E, R>,
) {
  let update: UpdateQueue<T, E, R> = {
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

export function ensureQueueIsScheduled<T, E, R>(
  instance: StateInterface<T, E, R>
) {
  if (!instance.queue) {
    return;
  }
  let queue: UpdateQueue<T, E, R> = instance.queue;
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

function flushUpdateQueue<T, E, R>(
  instance: StateInterface<T, E, R>,
) {

  if (!instance.queue) {
    return;
  }

  let current: UpdateQueue<T, E, R> | null = instance.queue;

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
