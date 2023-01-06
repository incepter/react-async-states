import {version} from "../package.json";
import {
  __DEV__,
  isFunction,
  isGenerator,
  isPromise,
  shallowClone,
} from "./shared";
import {
  asyncStatesKey,
  didNotExpire,
  hash,
  isSource,
  sourceIsSourceSymbol,
} from "./utils";
import devtools from "./devtools/Devtools";
import {hideStateInstanceInNewObject} from "./hide-object";
import {nextKey} from "./key-gen";

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


  originalProducer: Producer<T, E, R> | undefined;
  producerType: ProducerType;

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
  private latestRun?: RunTask<T, E, R> | null;
  willUpdate?: boolean;
  currentAbort?: AbortFn;
  private locks?: number;
  isEmitting?: boolean;

  readonly producer: ProducerFunction<T, E, R>;
  private readonly ownPool: PoolInterface;


  //endregion

  constructor(
    key: string,
    producer: Producer<T, E, R> | undefined | null,
    config?: ProducerConfig<T, E, R>,
    poolName?: string,
  ) {

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
    this.ownPool = poolToUse;
    this.uniqueId = nextUniqueId();
    this.config = shallowClone(config);
    this.originalProducer = producer ?? undefined;
    this.producerType = producer ? ProducerType.indeterminate : ProducerType.notProvided;

    if (__DEV__) {
      this.journal = [];
    }

    loadCache(this);

    let initializer = this.config.initialValue;
    let initialStateValue = isFunction(initializer) ?
      (initializer as Function).call(null, this.cache)
      :
      initializer;
    this.state = StateBuilder.initial(initialStateValue);
    this.lastSuccess = this.state;


    this.bindMethods();
    let instance = this;
    this.producer = producerWrapper.bind(null, {
      setProducerType: (type: ProducerType) => instance.producerType = type,
      setState: instance.setState,
      getState: instance.getState,
      instance: instance,
      setSuspender: (suspender: Promise<T>) => instance.suspender = suspender,
      replaceState: instance.replaceState.bind(instance),
      getProducer: () => instance.originalProducer,
    });

    this._source = makeSource(this);

    if (__DEV__) {
      devtools.emitCreation(this);
    }

    poolToUse.instances.set(key, this);
  }

  private bindMethods() {
    this.on = this.on.bind(this);
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

    this._source = makeSource(this);

    if (__DEV__) {
      devtools.emitCreation(this);
    }
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
    let that = this;
    if (!this.events) {
      this.events = {} as InstanceEvents<T, E, R>;
    }

    // @ts-ignore
    this.events[eventType] = eventHandler;

    return function () {
      let prevEvent = that.events![eventType];
      if (prevEvent && prevEvent === eventHandler) {
        delete that.events![eventType];
      }
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
    notify: boolean = true
  ): void {

    if (newState.status === Status.pending && this.config.skipPendingStatus) {
      return;
    }

    // pending update has always a pending status
    // setting the state should always clear this pending update
    // because it is stale, and we can safely skip it
    if (this.pendingUpdate) {
      clearTimeout(this.pendingUpdate.timeoutId);
      this.pendingUpdate = null;
    }

    if (newState.status === Status.pending) {
      if (
        isFunction(setTimeout)
        && this.config.skipPendingDelayMs
        && this.config.skipPendingDelayMs > 0
      ) {
        scheduleDelayedPendingUpdate(this, newState, notify);
        return;
      }
    }

    if (__DEV__) devtools.startUpdate(this);
    this.state = newState;
    this.version += 1;
    invokeInstanceEvents(this, "change");
    if (__DEV__) devtools.emitUpdate(this);

    if (this.state.status === Status.success) {
      this.lastSuccess = this.state;
      if (isCacheEnabled(this)) {
        saveCacheAfterSuccessfulUpdate(this);
      }
    }

    if (this.state.status !== Status.pending) {
      this.suspender = undefined;
    }

    if (notify) {
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
    this.locks! += 1;

    if (__DEV__) devtools.emitSubscription(this, subscriptionKey);
    return cleanup;
  }

  setState(
    newValue: T | StateFunctionUpdater<T, E, R>,
    status = Status.success,
  ): void {
    if (!StateBuilder[status]) {
      throw new Error(`Unknown status ('${status}')`);
    }
    this.willUpdate = true;
    if (this.state?.status === Status.pending || (
      isFunction(this.currentAbort) && !this.isEmitting
    )) {
      this.abort();
      this.currentAbort = undefined;
    }

    let effectiveValue = newValue;
    if (isFunction(newValue)) {
      effectiveValue = (newValue as StateFunctionUpdater<T, E, R>)(this.state);
    }
    // @ts-ignore
    const savedProps = cloneProducerProps({
      args: [effectiveValue],
      lastSuccess: this.lastSuccess,
      payload: shallowClone(this.payload),
    });
    if (__DEV__) devtools.emitReplaceState(this, savedProps);
    // @ts-ignore
    this.replaceState(StateBuilder[status](effectiveValue, savedProps));
    this.willUpdate = false;
  }

  replay(): AbortFn {
    let latestRunTask = this.latestRun;
    if (!latestRunTask) {
      return undefined;
    }
    return this.runImmediately(
      latestRunTask.producerEffectsCreator,
      latestRunTask.payload,
      undefined,
      latestRunTask.args
    );
  }

  replaceProducer(newProducer: Producer<T, E, R> | undefined) {
    this.originalProducer = newProducer;
    this.producerType = newProducer ? ProducerType.indeterminate : ProducerType.notProvided;
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

  run(createProducerEffects: ProducerEffectsCreator<T, E, R>, ...args: any[]) {
    return this.runWithCallbacks(createProducerEffects, undefined, args);
  }

  runWithCallbacks(
    createProducerEffects: ProducerEffectsCreator<T, E, R>,
    callbacks: ProducerCallbacks<T, E, R> | undefined,
    args: any[]
  ) {
    const effectDurationMs = Number(this.config.runEffectDurationMs) || 0;

    if (
      !isFunction(setTimeout) ||
      !this.config.runEffect ||
      effectDurationMs === 0
    ) {
      return this.runImmediately(
        createProducerEffects,
        shallowClone(this.payload),
        callbacks,
        args
      );
    }
    return this.runWithEffect(createProducerEffects, callbacks, args);
  }

  runp(createProducerEffects: ProducerEffectsCreator<T, E, R>, ...args: any[]) {
    const that = this;
    return new Promise<State<T, E, R>>(function runpPromise(resolve) {
      const callbacks: ProducerCallbacks<T, E, R> = {
        onError: resolve,
        onSuccess: resolve,
        onAborted: resolve,
      };
      that.runWithCallbacks(createProducerEffects, callbacks, args);
    });
  }

  runc(
    createProducerEffects: ProducerEffectsCreator<T, E, R>,
    props?: RUNCProps<T, E, R>
  ) {
    return this.runWithCallbacks(createProducerEffects, props, props?.args ?? []);
  }

  private runWithEffect(
    createProducerEffects: ProducerEffectsCreator<T, E, R>,
    internalCallbacks: ProducerCallbacks<T, E, R> | undefined,
    args: any[]
  ): AbortFn {

    const effectDurationMs = Number(this.config.runEffectDurationMs) || 0;

    const that = this;

    function scheduleDelayedRun(startDate) {
      let runAbortCallback: AbortFn | null = null;

      const timeoutId = setTimeout(function realRun() {
        that.pendingTimeout = null;
        runAbortCallback = that.runImmediately(
          createProducerEffects,
          shallowClone(that.payload),
          internalCallbacks,
          args
        );
      }, effectDurationMs);

      that.pendingTimeout = {
        startDate,
        id: timeoutId,
      };

      return function abortCleanup(reason) {
        clearTimeout(timeoutId);
        that.pendingTimeout = null;
        if (isFunction(runAbortCallback)) {
          runAbortCallback!(reason);
        }
      }
    }

    if (isFunction(setTimeout) && this.config.runEffect) {
      const now = Date.now();

      switch (this.config.runEffect) {
        case RunEffect.delay:
        case RunEffect.debounce:
        case RunEffect.takeLast:
        case RunEffect.takeLatest: {
          if (this.pendingTimeout) {
            const deadline = this.pendingTimeout.startDate + effectDurationMs;
            if (now < deadline) {
              clearTimeout(this.pendingTimeout.id);
            }
          }
          return scheduleDelayedRun(now);
        }
        case RunEffect.throttle:
        case RunEffect.takeFirst:
        case RunEffect.takeLeading: {
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
    return this.runImmediately(
      createProducerEffects,
      shallowClone(this.payload),
      internalCallbacks,
      args
    );
  }

  private runImmediately(
    producerEffectsCreator: ProducerEffectsCreator<T, E, R>,
    payload: Record<string, any> | null,
    internalCallbacks: ProducerCallbacks<T, E, R> | undefined,
    execArgs: any[]
  ): AbortFn {
    this.willUpdate = true;

    if (this.state.status === Status.pending || this.pendingUpdate) {
      if (this.pendingUpdate) {
        clearTimeout(this.pendingUpdate.timeoutId);
        // this.pendingUpdate.callback(); skip the callback!
        this.pendingUpdate = null;
      }
      this.abort();
      this.currentAbort = undefined;
    } else if (isFunction(this.currentAbort)) {
      this.abort();
    }

    if (isCacheEnabled(this)) {
      const topLevelParent: StateInterface<T, E, R> = getTopLevelParent(this);
      const runHash = hash(execArgs, this.payload, this.config.cacheConfig);

      const cachedState = topLevelParent.cache?.[runHash];

      if (cachedState) {
        if (didNotExpire(cachedState)) {
          if (cachedState.state !== this.state) {
            this.replaceState(cachedState.state);
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


    this.latestRun = {payload, args: execArgs, producerEffectsCreator};

    const props = constructPropsObject(
      this, producerEffectsCreator, internalCallbacks, runIndicators, payload, execArgs);

    const abort = props.abort;

    this.currentAbort = abort;

    this.producer(props, runIndicators, internalCallbacks);

    this.willUpdate = false;

    return abort;
  }

  abort(reason: any = undefined) {
    if (isFunction(this.currentAbort)) {
      this.currentAbort!(reason);
    }
  }

  dispose() {
    if (this.locks === undefined) {
      return true;
    }
    if (this.locks && this.locks > 0) {
      return false;
    }

    this.willUpdate = true;
    this.abort();

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
    this.ownPool.instances.delete(this.key);
    return true;
  }

  fork(forkConfig?: ForkConfig) {
    if (!this.forksIndex) {
      this.forksIndex = 0;
    }
    const mergedConfig: ForkConfig = shallowClone(defaultForkConfig, forkConfig);

    let {key} = mergedConfig;

    if (key === undefined) {
      key = `${this.key}-fork-${this.forksIndex + 1}`;
    }

    const clone = new AsyncState(key, this.originalProducer, this.config, this.ownPool.name);

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
  if (!instance.events || !instance.events[type]) {
    return;
  }
  switch (type) {
    case "change": {
      let changeEvents = instance.events[type];
      if (changeEvents) {
        let newState = instance.getState();
        if (Array.isArray(changeEvents)) {
          changeEvents.forEach(evt => {
            invokeSingleChangeEvent(newState, evt);
          });
        } else {
          invokeSingleChangeEvent(newState, changeEvents);
        }
      }
      return;
    }
    case "dispose": {
      let disposeEvents = instance.events[type];
      if (disposeEvents) {
        if (Array.isArray(disposeEvents)) {
          disposeEvents.forEach(evt => evt());
        } else {
          disposeEvents();
        }
      }
      return;
    }
    case "cache-change": {
      let cacheChangeEvents = instance.events[type];
      if (cacheChangeEvents) {
        if (Array.isArray(cacheChangeEvents)) {
          cacheChangeEvents.forEach(evt => evt(instance.cache));
        } else {
          cacheChangeEvents(instance.cache);
        }
      }
      return;
    }
  }
}

export type ProducerWrapperInput<T, E, R> = {
  setProducerType(type: ProducerType): void,
  setState: StateUpdater<T, E, R>,
  getState(): State<T, E, R>,
  instance?: StateInterface<T, E, R>,
  setSuspender(p: Promise<T>): void,
  replaceState(newState: State<T, E, R>, notify?: boolean),
  getProducer(): Producer<T, E, R> | undefined | null,
}

export function producerWrapper<T, E = any, R = any>(
  input: ProducerWrapperInput<T, E, R>,
  props: ProducerProps<T, E, R>,
  indicators: RunIndicators,
  callbacks?: ProducerCallbacks<T, E, R>,
): AbortFn {
  const currentProducer = input.getProducer();
  if (!isFunction(currentProducer)) {
    indicators.fulfilled = true;
    input.setProducerType(ProducerType.notProvided);
    input.setState(props.args[0], props.args[1]);

    if (callbacks) {
      let currentState = input.getState();
      switch (currentState.status) {
        case Status.success: {
          callbacks.onSuccess?.(currentState);
          break;
        }
        case Status.aborted: {
          callbacks.onAborted?.(currentState);
          break;
        }
        case Status.error: {
          callbacks.onError?.(currentState);
          break;
        }
      }
    }
    return;
  }
  // the running promise is used to pass the status to pending and as suspender in react18+
  let runningPromise;
  // the execution value is the return of the initial producer function
  let executionValue;
  // it is important to clone to capture properties and save only serializable stuff
  const savedProps = cloneProducerProps(props);

  try {
    executionValue = currentProducer!(props);
    if (indicators.aborted) {
      return;
    }
  } catch (e) {
    if (indicators.aborted) {
      return;
    }
    if (__DEV__ && input.instance) devtools.emitRunSync(input.instance, savedProps);
    indicators.fulfilled = true;
    let errorState = StateBuilder.error<T, E>(e, savedProps);
    input.replaceState(errorState);
    callbacks?.onError?.(errorState);
    return;
  }

  if (isGenerator(executionValue)) {
    input.setProducerType(ProducerType.generator);
    if (__DEV__ && input.instance) devtools.emitRunGenerator(input.instance, savedProps);
    // generatorResult is either {done, value} or a promise
    let generatorResult;
    try {
      generatorResult = wrapStartedGenerator(executionValue, props, indicators);
    } catch (e) {
      indicators.fulfilled = true;
      let errorState = StateBuilder.error<T, E>(e, savedProps);
      input.replaceState(errorState);
      callbacks?.onError?.(errorState);
      return;
    }
    if (generatorResult.done) {
      indicators.fulfilled = true;
      let successState = StateBuilder.success(generatorResult.value, savedProps);
      input.replaceState(successState);
      callbacks?.onSuccess?.(successState);
      return;
    } else {
      runningPromise = generatorResult;
      input.setSuspender(runningPromise);
      input.replaceState(StateBuilder.pending(savedProps));
    }
  } else if (isPromise(executionValue)) {
    input.setProducerType(ProducerType.promise);
    if (__DEV__ && input.instance) devtools.emitRunPromise(input.instance, savedProps);
    runningPromise = executionValue;
    input.setSuspender(runningPromise);
    input.replaceState(StateBuilder.pending(savedProps));
  } else { // final value
    if (__DEV__ && input.instance) devtools.emitRunSync(input.instance, savedProps);
    indicators.fulfilled = true;
    input.setProducerType(ProducerType.sync);
    let successState = StateBuilder.success(executionValue, savedProps);
    input.replaceState(successState);
    callbacks?.onSuccess?.(successState);
    return;
  }

  runningPromise
    .then(stateData => {
      let aborted = indicators.aborted;
      if (!aborted) {
        indicators.fulfilled = true;
        let successState = StateBuilder.success(stateData, savedProps);
        input.replaceState(successState);
        callbacks?.onSuccess?.(successState);
      }
    })
    .catch(stateError => {
      let aborted = indicators.aborted;
      if (!aborted) {
        indicators.fulfilled = true;
        let errorState = StateBuilder.error<T, E>(stateError, savedProps);
        input.replaceState(errorState);
        callbacks?.onError?.(errorState);
      }
    });
}

export function cloneProducerProps<T, E, R>(props: ProducerProps<T, E, R>): ProducerSavedProps<T> {
  const output: ProducerSavedProps<T> = {
    lastSuccess: shallowClone(props.lastSuccess),
    payload: props.payload,
    args: props.args,
  };

  delete output.lastSuccess!.props;

  return output;
}

function constructPropsObject<T, E, R>(
  instance: StateInterface<T, E, R>,
  producerEffectsCreator: ProducerEffectsCreator<T, E, R>,
  internalCallbacks: ProducerCallbacks<T, E, R> | undefined,
  runIndicators: RunIndicators,
  payload: Record<string, any> | null,
  args: any[]
): ProducerProps<T, E, R> {


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
  Object.assign(props, producerEffectsCreator(props));

  return props;


  function emit(
    updater: T | StateFunctionUpdater<T, E, R>,
    status?: Status
  ): void {
    if (runIndicators.cleared && instance.state.status === Status.aborted) {
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
    instance.setState(updater, status);
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
        instance.replaceState(abortedState);
        internalCallbacks?.onAborted?.(abortedState);
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
  key: string,
  producer?: Producer<T, E, R> | undefined | null,
  config?: ProducerConfig<T, E, R>,
  pool?: string,
): Source<T, E, R> {
  return new AsyncState(key, producer, config, pool)._source;
}

const defaultForkConfig: ForkConfig = Object.freeze({keepState: false});
let uniqueId: number = 0;

function nextUniqueId() {
  return ++uniqueId;
}

function readSource<T, E, R>(possiblySource: Source<T, E, R>): StateInterface<T, E, R> {
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
    instance.state = newState; // <-- status is pending!
    instance.pendingUpdate = null;
    if (__DEV__) devtools.emitUpdate(instance);

    if (notify) {
      notifySubscribers(instance as StateInterface<T, E, R>);
    }
  }

  const timeoutId = setTimeout(callback, instance.config.skipPendingDelayMs);
  instance.pendingUpdate = {callback, timeoutId};
}

function saveCacheAfterSuccessfulUpdate<T, E, R>(instance: StateInterface<T, E, R>) {
  const topLevelParent: StateInterface<T, E, R> = getTopLevelParent(instance);
  const {config: {cacheConfig}} = topLevelParent;
  const {state} = instance;
  const {props} = state;

  if (!topLevelParent.cache) {
    topLevelParent.cache = {};
  }

  const runHash = hash(props?.args, props?.payload, cacheConfig);
  if (topLevelParent.cache[runHash]?.state !== state) {

    topLevelParent.cache[runHash] = {
      state: state,
      deadline: cacheConfig?.getDeadline?.(state) || Infinity,
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
    const topLevelParent: StateInterface<T, E, R> = getTopLevelParent(instance);
    instance.cache = topLevelParent.cache;
    return;
  }

  const loadedCache = instance.config.cacheConfig!.load!();

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
  const hiddenInstance = hideStateInstanceInNewObject(instance);

  const source: Source<T, E, R> = Object.assign(hiddenInstance, {
    key: instance.key,
    uniqueId: instance.uniqueId,

    on: instance.on,
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
    run: instance.run.bind(instance, standaloneProducerEffectsCreator),
    runp: instance.runp.bind(instance, standaloneProducerEffectsCreator),
    runc: instance.runc.bind(instance, standaloneProducerEffectsCreator),

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

  Object.defineProperty(source, sourceIsSourceSymbol, {
    value: true,
    writable: false,
    enumerable: false,
    configurable: false,
  });

  return Object.freeze(source);
}


function isCacheEnabled(instance: StateInterface<any>): boolean {
  return !!instance.config.cacheConfig?.enabled;
}

export const StateBuilder = Object.freeze({
  initial<T>(initialValue): InitialState<T> {
    return Object.freeze({
      status: Status.initial,
      data: initialValue,
      props: null,
      timestamp: Date.now()
    });
  },
  error<T, E = any>(data, props): ErrorState<T, E> {
    return Object.freeze({
      status: Status.error,
      data,
      props,
      timestamp: Date.now()
    });
  },
  success<T>(data, props): SuccessState<T> {
    return Object.freeze({
      status: Status.success,
      data,
      props,
      timestamp: Date.now()
    });
  },
  pending<T>(props): PendingState<T> {
    return Object.freeze({
      status: Status.pending,
      data: null,
      props,
      timestamp: Date.now()
    });
  },
  aborted<T, E = any, R = any>(reason, props): AbortedState<T, E, R> {
    return Object.freeze({
      status: Status.aborted,
      data: reason,
      props,
      timestamp: Date.now()
    });
  }
}) as StateBuilderInterface;
//endregion

//region producerEffects creators helpers

export function standaloneProducerRunEffectFunction<T, E, R>(
  input: ProducerRunInput<T, E, R>,
  config: ProducerRunConfig | null,
  ...args: any[]
) {
  if (isSource(input)) {
    let instance = readSource(input as Source<T, E, R>)
      .getLane(config?.lane);

    return instance.run(standaloneProducerEffectsCreator, ...args);

  } else if (isFunction(input)) {
    let instance = new AsyncState(
      nextKey(), input as Producer<T, E, R>, {hideFromDevtools: true});
    if (config?.payload) {
      instance.mergePayload(config.payload)
    }
    return instance.run(standaloneProducerEffectsCreator, ...args);
  }
  return undefined;
}

export function standaloneProducerRunpEffectFunction<T, E, R>(
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
      input as Producer<T, E, R>, {hideFromDevtools: true});
    if (config?.payload) {
      instance.mergePayload(config.payload);
    }
    return runWhileSubscribingToNextResolve(instance, props, args);

  } else {
    return undefined;
  }
}

export function runWhileSubscribingToNextResolve<T, E, R>(
  instance: StateInterface<T, E, R>,
  props: ProducerProps<T, E, R>,
  args
): Promise<State<T, E, R>> {
  return new Promise(resolve => {
    let unsubscribe = instance.subscribe({cb: subscription});
    props.onAbort(unsubscribe);

    let abort = instance.run(standaloneProducerEffectsCreator, ...args);
    props.onAbort(abort);

    function subscription(newState: State<T, E, R>) {
      if (newState.status === Status.success
        || newState.status === Status.error) {
        if (isFunction(unsubscribe)) {
          unsubscribe!();
        }
        resolve(newState);
      }
    }
  });
}

export function standaloneProducerSelectEffectFunction<T, E, R>(
  input: ProducerRunInput<T, E, R>,
  lane?: string,
) {
  if (isSource(input)) {
    return (input as Source<T, E, R>).getLaneSource(lane).getState()
  }
}

function standaloneProducerEffectsCreator<T, E, R>(props: ProducerProps<T, E, R>): ProducerEffects {
  return {
    run: standaloneProducerRunEffectFunction,
    select: standaloneProducerSelectEffectFunction,
    runp: standaloneProducerRunpEffectFunction.bind(null, props),
  };
}


//endregion

//region WRAP PRODUCER FUNCTION


function wrapStartedGenerator(
  generatorInstance,
  props,
  indicators
) {
  let lastGeneratorValue = generatorInstance.next();

  while (!lastGeneratorValue.done && !isPromise(lastGeneratorValue.value)) {
    lastGeneratorValue = generatorInstance.next(lastGeneratorValue.value);
  }

  if (lastGeneratorValue.done) {
    return {done: true, value: lastGeneratorValue.value};
  } else {
    // encountered a promise
    return new Promise((
      resolve,
      reject
    ) => {
      const abortGenerator = stepAsyncAndContinueStartedGenerator(
        generatorInstance,
        lastGeneratorValue,
        resolve,
        reject
      );

      function abortFn() {
        if (!indicators.fulfilled && !indicators.aborted) {
          abortGenerator();
        }
      }

      props.onAbort(abortFn);
    });
  }
}

function stepAsyncAndContinueStartedGenerator(
  generatorInstance,
  lastGeneratorValue,
  onDone,
  onReject
) {
  let aborted = false;

  // we enter here only if startupValue is pending promise of the generator instance!
  lastGeneratorValue.value.then(step, onGeneratorCatch);

  function onGeneratorResolve(resolveValue) {
    if (aborted) {
      return;
    }
    if (!lastGeneratorValue.done) {
      step();
    } else {
      onDone(resolveValue);
    }
  }

  function onGeneratorCatch(e) {
    if (aborted) {
      return;
    }
    if (lastGeneratorValue.done) {
      onDone(e);
    } else {
      try {
        lastGeneratorValue = generatorInstance.throw(e);
      } catch (newException) {
        onReject(newException);
      }
      if (lastGeneratorValue.done) {
        onDone(lastGeneratorValue.value);
      } else {
        step();
      }
    }
  }

  function step() {
    if (aborted) {
      return;
    }
    try {
      lastGeneratorValue = generatorInstance.next(lastGeneratorValue.value);
    } catch (e) {
      onGeneratorCatch(e);
    }
    Promise
      .resolve(lastGeneratorValue.value)
      .then(onGeneratorResolve, onGeneratorCatch)
  }

  return function abort() {
    aborted = true;
  }
}

//endregion

//region Exports
export {
  readSource,
  standaloneProducerEffectsCreator,
};
//endregion

//region TYPES

export interface BaseSource<T, E = any, R = any> {
  // identity
  key: string,
  uniqueId: number,

  getVersion(): number,

  getPayload(): Record<string, any>,

  mergePayload(partialPayload?: Record<string, any>),

  // state
  getState(): State<T, E, R>,

  // todo: overload this!!!!
  setState(updater: StateFunctionUpdater<T, E, R> | T, status?: Status,): void;

  // subscriptions
  subscribe(cb: (s: State<T, E, R>) => void): AbortFn

  subscribe(subProps: AsyncStateSubscribeProps<T, E, R>): AbortFn

  subscribe(argv: ((s: State<T, E, R>) => void) | AsyncStateSubscribeProps<T, E, R>): AbortFn

  // producer
  replay(): AbortFn,

  abort(reason?: any): void,

  replaceProducer(newProducer: Producer<T, E, R> | undefined),

  // cache
  invalidateCache(cacheKey?: string): void,

  replaceCache(cacheKey: string, cache: CachedState<T, E, R>): void,

  patchConfig(partialConfig?: Partial<ProducerConfig<T, E, R>>),

  getConfig(): ProducerConfig<T, E, R>,

  on(
    eventType: InstanceChangeEvent,
    eventHandler: InstanceChangeEventHandlerType<T, E, R>
  ): (() => void),

  on(
    eventType: InstanceDisposeEvent,
    eventHandler: InstanceDisposeEventHandlerType<T, E, R>
  ): (() => void),

  on(
    eventType: InstanceCacheChangeEvent,
    eventHandler: InstanceCacheChangeEventHandlerType<T, E, R>
  ): (() => void),

}


export type InstanceEventHandlerType<T, E, R> =
  InstanceChangeEventHandlerType<T, E, R>
  |
  InstanceDisposeEventHandlerType<T, E, R>
  |
  InstanceCacheChangeEventHandlerType<T, E, R>;


export type StateChangeEventHandler<T, E = any, R = any> =
  ((newState: State<T, E, R>) => void)
  |
  InstanceChangeEventObject<T, E, R>;

export type InstanceChangeEventObject<T, E = any, R = any> = {
  status: Status
  handler: ((newState: State<T, E, R>) => void),
}

export type InstanceChangeEventHandlerType<T, E, R> =
  StateChangeEventHandler<T, E, R>
  | StateChangeEventHandler<T, E, R>[];

export type InstanceDisposeEventHandlerType<T, E, R> =
  (() => void)
  | (() => void)[];
export type InstanceCacheChangeEventHandlerType<T, E, R> =
  ((cache: Record<string, CachedState<T, E, R>> | null | undefined) => void)
  | ((cache: Record<string, CachedState<T, E, R>> | null | undefined) => void)[];

export type InstanceChangeEvent = "change";
export type InstanceDisposeEvent = "dispose";
export type InstanceCacheChangeEvent = "cache-change";

export type InstanceEventType = InstanceChangeEvent |
  InstanceDisposeEvent |
  InstanceCacheChangeEvent;

export type AsyncStateSubscribeProps<T, E, R> = {
  key?: string,
  flags?: number,
  origin?: number,
  cb(s: State<T, E, R>): void,
}

export type InstanceEvents<T, E, R> = {
  change?: InstanceChangeEventHandlerType<T, E, R>,
  dispose?: InstanceDisposeEventHandlerType<T, E, R>,
  ['cache-change']?: InstanceCacheChangeEventHandlerType<T, E, R>,
}

export interface StateInterface<T, E = any, R = any> extends BaseSource<T, E, R> {
  // identity
  version: number,
  _source: Source<T, E, R>,
  config: ProducerConfig<T, E, R>,
  payload?: Record<string, any> | null,

  // state
  state: State<T, E, R>,
  lastSuccess: SuccessState<T> | InitialState<T>,

  replaceState(newState: State<T, E, R>, notify?: boolean): void,

  // subscriptions
  subsIndex?: number;
  subscriptions?: Record<number, StateSubscription<T, E, R>> | null,

  // producer
  suspender?: Promise<T>,
  producerType?: ProducerType,
  producer: ProducerFunction<T, E, R>,
  originalProducer: Producer<T, E, R> | undefined | null,

  isEmitting?: boolean;
  willUpdate?: boolean;
  currentAbort?: AbortFn;

  // lanes and forks
  forksIndex?: number,
  parent?: StateInterface<T, E, R> | null,
  lanes?: Record<string, StateInterface<T, E, R>> | null,

  // cache
  cache?: Record<string, CachedState<T, E, R>> | null,

  events?: InstanceEvents<T, E, R>;

  // dev properties
  journal?: any[], // for devtools, dev only

  // methods & overrides
  dispose(): boolean,

  hasLane(laneKey: string): boolean,

  getLane(laneKey?: string): StateInterface<T, E, R>,

  fork(forkConfig?: ForkConfig): StateInterface<T, E, R>,

  // lanes and forks
  removeLane(laneKey?: string): boolean,

  getLane(laneKey?: string): BaseSource<T, E, R>,

  fork(forkConfig?: ForkConfig): BaseSource<T, E, R>,

  runWithCallbacks(
    createProducerEffects: ProducerEffectsCreator<T, E, R>,
    callbacks: ProducerCallbacks<T, E, R> | undefined,
    args: any[]
  ),

  run(
    createProducerEffects: ProducerEffectsCreator<T, E, R>,
    ...args: any[]
  ): AbortFn,

  runp(
    createProducerEffects: ProducerEffectsCreator<T, E, R>,
    ...args: any[]
  ): Promise<State<T, E, R>>,

  runc(
    createProducerEffects: ProducerEffectsCreator<T, E, R>,
    props?: RUNCProps<T, E, R>
  ): AbortFn,

}

export interface RUNCProps<T, E, R> extends ProducerCallbacks<T, E, R> {
  args?: any[],
}

export enum Status {
  error = "error",
  pending = "pending",
  success = "success",
  aborted = "aborted",
  initial = "initial",
}

export enum RunEffect {
  delay = "delay",
  debounce = "debounce",
  takeLast = "takeLast",
  takeLatest = "takeLatest",

  throttle = "throttle",
  takeFirst = "takeFirst",
  takeLeading = "takeLeading",
}


export type LastSuccessSavedState<T> = {
  data: T,
  timestamp: number,
  props?: ProducerSavedProps<T> | null,
  status: Status.success | Status.initial,
}

export interface BaseState<T> {
  data: T,
  status: Status,
  timestamp: number,
  props?: ProducerSavedProps<T> | null,
}

export type SuccessState<T> = {
  data: T,
  timestamp: number,
  status: Status.success,
  props: ProducerSavedProps<T>,
}

export type ErrorState<T, E = any> = {
  data: E,
  timestamp: number,
  status: Status.error,
  props: ProducerSavedProps<T>,
}

export type PendingState<T> = {
  data: null,
  timestamp: number,
  status: Status.pending,
  props: ProducerSavedProps<T>,
}

export type InitialState<T> = {
  props: null,
  timestamp: number,
  data: T | undefined,
  status: Status.initial,
}

export type AbortedState<T, E = any, R = any> = {
  data: R,
  timestamp: number,
  status: Status.aborted,
  props: ProducerSavedProps<T>,
}

export type State<T, E = any, R = any> = InitialState<T> |
  PendingState<T> |
  AbortedState<T, E, R> |
  SuccessState<T> |
  ErrorState<T, E>

export type AbortFn = ((reason?: any) => void) | undefined;

export type OnAbortFn = (cb?: ((reason?: any) => void)) => void;

export interface ProducerProps<T, E = any, R = any> extends ProducerEffects {
  abort: AbortFn,
  onAbort: OnAbortFn,
  emit: StateUpdater<T, E, R>,

  args: any[],
  payload: any,
  lastSuccess: State<T, E, R>,
  isAborted: () => boolean,

  getState: () => State<T, E, R>,
}

export type RunIndicators = {
  cleared: boolean,
  aborted: boolean,
  fulfilled: boolean,
}

export type ProducerCallbacks<T, E, R> = {
  onError?(errorState: ErrorState<T, E>),
  onSuccess?(successState: SuccessState<T>),
  onAborted?(aborted: AbortedState<T, E, R>),
}

export type ProducerSavedProps<T> = {
  args?: any[],
  payload?: Record<string, any> | null,
  lastSuccess?: LastSuccessSavedState<T>,
}

export type Producer<T, E = any, R = any> =
  ((props: ProducerProps<T, E, R>) => (T | Promise<T> | Generator<any, T, any>));

export type ProducerFunction<T, E = any, R = any> = (
  props: ProducerProps<T, E, R>,
  runIndicators: RunIndicators,
  internalCallbacks?: ProducerCallbacks<T, E, R>,
) => AbortFn;

export enum ProducerType {
  indeterminate = 0,
  sync = 1,
  promise = 2,
  generator = 3,
  notProvided = 4,
}

export type ProducerConfig<T, E = any, R = any> = {
  skipPendingStatus?: boolean,
  initialValue?: T | ((cache: Record<string, CachedState<T, E, R>>) => T),
  cacheConfig?: CacheConfig<T, E, R>,
  runEffectDurationMs?: number,
  runEffect?: RunEffect,
  skipPendingDelayMs?: number,
  resetStateOnDispose?: boolean,

  // dev only
  hideFromDevtools?: boolean,
}

export type StateFunctionUpdater<T, E = any, R = any> = (updater: State<T, E, R>) => T;

export type StateUpdater<T, E = any, R = any> = (
  updater: T | StateFunctionUpdater<T, E, R>,
  status?: Status
) => void;

export interface Source<T, E = any, R = any> extends BaseSource<T, E, R> {
  run(...args: any[]): AbortFn,

  runp(...args: any[]): Promise<State<T, E, R>>,

  runc(props: RUNCProps<T, E, R>): AbortFn,

  hasLane(laneKey: string): boolean,

  removeLane(laneKey?: string): boolean,

  getLaneSource(laneKey?: string): Source<T, E, R>,

  getAllLanes(): Source<T, E, R>[],
}

export type RunTask<T, E, R> = {
  args: any[],
  payload: Record<string, any> | null,
  producerEffectsCreator: ProducerEffectsCreator<T, E, R>,
}

export type StateSubscription<T, E, R> = {
  cleanup: () => void,
  props: AsyncStateSubscribeProps<T, E, R>
};

export type OnCacheLoadProps<T, E = any, R = any> = {
  cache: Record<string, CachedState<T, E, R>>,
  setState(
    newValue: T | StateFunctionUpdater<T, E, R>, status?: Status): void
}

export type CacheConfig<T, E = any, R = any> = {
  enabled: boolean,
  getDeadline?(currentState: State<T, E, R>): number,
  hash?(args: any[] | undefined, payload: Record<string, any> | null): string,

  persist?(cache: Record<string, CachedState<T, E, R>>): void,
  load?(): Record<string, CachedState<T, E, R>> | Promise<Record<string, CachedState<T, E, R>>>,

  onCacheLoad?({cache, setState}: OnCacheLoadProps<T, E, R>): void,
}

export type CachedState<T, E = any, R = any> = {
  state: State<T, E, R>,
  addedAt: number,
  deadline: number,
}

export interface StateBuilderInterface {
  initial: <T> (initialValue: T) => InitialState<T>,
  pending: <T>(props: ProducerSavedProps<T>) => PendingState<T>,
  success: <T>(data: T, props: ProducerSavedProps<T> | null) => SuccessState<T>,
  error: <T, E>(data: any, props: ProducerSavedProps<T>) => ErrorState<T, E>,
  aborted: <T, E, R>(
    reason: any, props: ProducerSavedProps<T>) => AbortedState<T, E, R>,
}

export type ForkConfig = {
  key?: string,
  keepState?: boolean,
  keepCache?: boolean,
}

export type AsyncStateKeyOrSource<T, E = any, R = any> =
  string
  | Source<T, E, R>;

export interface ProducerEffects {
  run: <T, E, R>(
    input: ProducerRunInput<T, E, R>, config: ProducerRunConfig | null,
    ...args: any[]
  ) => AbortFn,

  runp: <T, E, R>(
    input: ProducerRunInput<T, E, R>, config: ProducerRunConfig | null,
    ...args: any[]
  ) => Promise<State<T, E, R>> | undefined,

  select: <T, E, R>(
    input: AsyncStateKeyOrSource<T, E, R>,
    lane?: string
  ) => State<T, E, R> | undefined,
}

export type ProducerEffectsCreator<T, E, R> = (props: ProducerProps<T, E, R>) => ProducerEffects;

export type ProducerRunInput<T, E = any, R = any> =
  AsyncStateKeyOrSource<T, E, R>
  | Producer<T, E, R>;

export type ProducerRunConfig = {
  lane?: string,
  fork?: boolean,
  payload?: Record<string, any> | null,
};

export type PendingTimeout = { id: ReturnType<typeof setTimeout>, startDate: number };
export type PendingUpdate = { timeoutId: ReturnType<typeof setTimeout>, callback(): void };

//endregion


//region Pool Definition

let ownLibraryPools = {} as AsyncStatePools;
let LIBRARY_POOLS_PROPERTY = "__ASYNC_STATES_POOLS__";
let globalContext = window || globalThis || null;
let ownPool: PoolInterface = createPool(getPoolName("default"));
let didWarnAboutExistingInstanceRecreation = false;

let poolInUse: PoolInterface = ownPool;
ownLibraryPools[ownPool.name] = ownPool;

type AsyncStatePools = Record<string, PoolInterface>;

export interface PoolInterface {
  name: string,
  version: string,

  mergePayload(payload: Record<string, any>): void,

  instances: Map<string, StateInterface<any>>,
}

function getLibraryPools(): AsyncStatePools {
  return ownLibraryPools;
}


export function createPool(name: string): PoolInterface {
  let instances = new Map<string, StateInterface<any>>();
  return {
    name,
    version,
    instances,
    mergePayload(payload: Record<string, any>) {
      instances.forEach(instance => instance.mergePayload(payload))
    }
  };
}

function getPoolName(name: string) {
  return `ASYNC-STATES-${name}-POOL`;
}

export function enableDiscovery(name?: string) {
  if (!globalContext) {
    return;
  }

  let libraryPools = getLibraryPools();
  let poolName = getPoolName(name || "default");
  let maybePool = libraryPools[poolName];

  if (!maybePool) {
    if (__DEV__) {
      console.error(`enableDiscovery called on a non existent pool ${name}`);
    }
    return;
  }

  globalContext[`${LIBRARY_POOLS_PROPERTY}_${poolName}`] = maybePool;
}

let didSetDefaultPool;
if (__DEV__) {
  didSetDefaultPool = false;
}
export function setDefaultPool(name: string): Promise<void> {
  if (!name) {
    throw new Error("name is required");
  }
  return new Promise((resolve, reject) => {
    if (!globalContext) {
      reject();
    }
    let poolSharedName = `${LIBRARY_POOLS_PROPERTY}_${getPoolName(name)}`;
    let maybePool = globalContext[poolSharedName] as PoolInterface;
    if (!maybePool) {
      reject(`No shared pool with name ${name}`);
    }
    poolInUse = maybePool;
    didSetDefaultPool = true;
    if (didSetDefaultPool) {
      throw new Error("setDefaultPool can only be called once for now")
    }
    resolve();
  });
}

function getOrCreatePool(name?: string): PoolInterface {
  if (!name) {
    return poolInUse;
  }

  let poolName = getPoolName(name);
  let libraryPools = getLibraryPools();
  let candidate = libraryPools[poolName];

  if (!candidate) {
    let newPool = createPool(poolName);
    libraryPools[newPool.name] = newPool;
    return newPool;
  }

  return candidate;
}

function warnAboutAlreadyExistingSourceWithSameKey(key) {
  if (!didWarnAboutExistingInstanceRecreation) {
    console.error(`
    [WARNING] - A previous instance with key ${key} exists,
    calling 'createSource' with the same key will result in 
    patching the producer and the config.
    `);
    didWarnAboutExistingInstanceRecreation = true;
  }
}

//endregion
