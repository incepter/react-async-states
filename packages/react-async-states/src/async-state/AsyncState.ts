import {__DEV__, isGenerator, isPromise, shallowClone,} from "shared";
import {
  asyncStatesKey,
  didNotExpire,
  hash,
  isAsyncStateSource,
  sourceIsSourceSymbol,
} from "./utils";
import devtools from "../devtools";
import {areRunEffectsSupported} from "shared/features";
import {hideStateInstanceInNewObject} from "./hide-object";
import {nextKey} from "./key-gen";

class AsyncState<T> implements StateInterface<T> {
  //region properties
  key: string;
  journal: any[];
  uniqueId: number;
  _source: Source<T>;
  version: number = 0;
  config: ProducerConfig<T>;
  payload: Record<string, any> | null = null;

  state: State<T>;
  lastSuccess: State<T>;
  producerType: ProducerType;

  cache: Record<string, CachedState<T>> | null = null;

  forksIndex: number = 0;
  parent: StateInterface<T> | null = null;
  lanes: Record<string, StateInterface<T>> | null = null;

  subsIndex: number = 0;
  subscriptions: Record<number, StateSubscription<T>> | null = null;

  producer: ProducerFunction<T>;
  suspender: Promise<T> | undefined = undefined;
  originalProducer: Producer<T> | undefined;

  pendingUpdate: PendingUpdate | null = null;

  private locks: number = 0;
  private pendingTimeout: PendingTimeout | null = null;

  willUpdate: boolean = false;
  currentAbort: AbortFn = undefined;
  private latestRun: RunTask<T> | null = null;

  //endregion

  constructor(
    key: string,
    producer: Producer<T> | undefined | null,
    config?: ProducerConfig<T>,
  ) {
    this.key = key;
    this.uniqueId = nextUniqueId();
    this.config = shallowClone(config);
    this.producer = wrapProducerFunction(this);
    this.originalProducer = producer ?? undefined;
    this.producerType = producer ? ProducerType.indeterminate : ProducerType.notProvided;

    if (__DEV__) {
      this.journal = [];
    }

    loadCache(this);

    let initializer = this.config.initialValue;
    let initialStateValue = typeof initializer === "function" ?
      initializer.call(null, this.cache)
      :
      initializer;
    this.state = StateBuilder.initial(initialStateValue);
    this.lastSuccess = this.state;


    this.abort = this.abort.bind(this);
    this.getState = this.getState.bind(this);
    this.setState = this.setState.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.getPayload = this.getPayload.bind(this);
    this.mergePayload = this.mergePayload.bind(this);

    this.replay = this.replay.bind(this);
    this.getConfig = this.getConfig.bind(this);
    this.removeLane = this.removeLane.bind(this);
    this.patchConfig = this.patchConfig.bind(this);
    this.replaceCache = this.replaceCache.bind(this);
    this.invalidateCache = this.invalidateCache.bind(this);
    this.replaceProducer = this.replaceProducer.bind(this);

    this._source = makeSource(this);

    Object.preventExtensions(this);

    if (__DEV__) {
      console.log('emitting creation', devtools)
      devtools.emitCreation(this);
    }
  }

  getState(): State<T> {
    return this.state;
  }


  getConfig(): ProducerConfig<T> {
    return this.config;
  }

  patchConfig(partialConfig: Partial<ProducerConfig<T>>) {
    Object.assign(this.config, partialConfig);
  }

  getPayload(): Record<string, any> {
    if (!this.payload) {
      this.payload = {};
    }
    return this.payload;
  }

  removeLane(laneKey?: string): boolean {
    if (!this.lanes || !laneKey) {
      return false;
    }
    return delete this.lanes[laneKey];
  }

  getLane(laneKey?: string): StateInterface<T> {
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
    newState: State<T>,
    notify: boolean = true
  ): void {

    if (newState.status === AsyncStateStatus.pending && this.config.skipPendingStatus) {
      return;
    }

    // pending update has always a pending status
    // setting the state should always clear this pending update
    // because it is stale, and we can safely skip it
    if (this.pendingUpdate) {
      clearTimeout(this.pendingUpdate.timeoutId);
      this.pendingUpdate = null;
    }

    if (newState.status === AsyncStateStatus.pending) {
      if (
        areRunEffectsSupported()
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
    if (__DEV__) devtools.emitUpdate(this);

    if (this.state.status === AsyncStateStatus.success) {
      this.lastSuccess = this.state;
      if (isCacheEnabled(this)) {
        saveCacheAfterSuccessfulUpdate(this);
      }
    }

    if (this.state.status !== AsyncStateStatus.pending) {
      this.suspender = undefined;
    }

    if (notify) {
      notifySubscribers(this as StateInterface<any>);
    }
  }

  subscribe(
    cb,
    subKey?: string | undefined
  ): AbortFn {
    if (!this.subscriptions) {
      this.subscriptions = {};
    }

    let that = this;
    this.subsIndex += 1;
    let subscriptionKey: string | undefined = subKey;

    if (subKey === undefined) {
      subscriptionKey = `subscription-$${this.subsIndex}`;
    }

    function cleanup() {
      that.locks -= 1;
      delete that.subscriptions![subscriptionKey!];
      if (__DEV__) devtools.emitUnsubscription(that, subscriptionKey!);
      if (that.config.resetStateOnDispose) {
        if (Object.values(that.subscriptions!).length === 0) {
          that.dispose();
        }
      }
    }

    this.subscriptions[subscriptionKey!] = {
      cleanup,
      callback: cb,
      key: subscriptionKey,
    };
    this.locks += 1;

    if (__DEV__) devtools.emitSubscription(this, subscriptionKey!);
    return cleanup;
  }

  setState(
    newValue: T | StateFunctionUpdater<T>,
    status = AsyncStateStatus.success,
  ): void {
    if (!StateBuilder[status]) {
      throw new Error(`Couldn't replace state to unknown status ${status}.`);
    }
    this.willUpdate = true;
    if (this.state?.status === AsyncStateStatus.pending) {
      this.abort();
      this.currentAbort = undefined;
    }

    let effectiveValue = newValue;
    if (typeof newValue === "function") {
      effectiveValue = (newValue as StateFunctionUpdater<T>)(this.state);
    }
    // @ts-ignore
    const savedProps = cloneProducerProps({
      args: [effectiveValue],
      lastSuccess: this.lastSuccess,
      payload: shallowClone(this.payload),
    });
    if (__DEV__) devtools.emitReplaceState(this, savedProps);
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

  replaceProducer(newProducer: Producer<any> | undefined) {
    this.originalProducer = newProducer;
    this.producerType = newProducer ? ProducerType.indeterminate : ProducerType.notProvided;
  }

  invalidateCache(cacheKey?: string) {
    if (isCacheEnabled(this)) {
      const topLevelParent: StateInterface<T> = getTopLevelParent(this);

      if (!cacheKey) {
        topLevelParent.cache = {};
      } else if (topLevelParent.cache) {
        delete topLevelParent.cache[cacheKey];
      }

      if (
        topLevelParent.cache &&
        typeof topLevelParent.config.cacheConfig?.persist === "function"
      ) {
        topLevelParent.config.cacheConfig.persist(topLevelParent.cache);
      }

      spreadCacheChangeOnLanes(topLevelParent);
    }
  }

  run(createProducerEffects: ProducerEffectsCreator<T>, ...args: any[]) {
    return this.runWithCallbacks(createProducerEffects, undefined, args);
  }

  runWithCallbacks(
    createProducerEffects: ProducerEffectsCreator<T>,
    callbacks: ProducerCallbacks<T> | undefined,
    args: any[]
  ) {
    const effectDurationMs = Number(this.config.runEffectDurationMs) || 0;

    if (
      !areRunEffectsSupported() ||
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

  runp(createProducerEffects: ProducerEffectsCreator<T>, ...args: any[]) {
    const that = this;
    return new Promise<State<T>>(function runpPromise(resolve) {
      const callbacks: ProducerCallbacks<T> = {
        onError: resolve,
        onSuccess: resolve,
        onAborted: resolve,
      };
      that.runWithCallbacks(createProducerEffects, callbacks, args);
    });
  }

  runc(createProducerEffects: ProducerEffectsCreator<T>, props?: RUNCProps<T>) {
    return this.runWithCallbacks(createProducerEffects, props, props?.args ?? []);
  }

  private runWithEffect(
    createProducerEffects: ProducerEffectsCreator<T>,
    internalCallbacks: ProducerCallbacks<T> | undefined,
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
        if (typeof runAbortCallback === "function") {
          runAbortCallback(reason);
        }
      }
    }

    if (areRunEffectsSupported() && this.config.runEffect) {
      const now = Date.now();

      switch (this.config.runEffect) {
        case ProducerRunEffects.delay:
        case ProducerRunEffects.debounce:
        case ProducerRunEffects.takeLast:
        case ProducerRunEffects.takeLatest: {
          if (this.pendingTimeout) {
            const deadline = this.pendingTimeout.startDate + effectDurationMs;
            if (now < deadline) {
              clearTimeout(this.pendingTimeout.id);
            }
          }
          return scheduleDelayedRun(now);
        }
        case ProducerRunEffects.throttle:
        case ProducerRunEffects.takeFirst:
        case ProducerRunEffects.takeLeading: {
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
    producerEffectsCreator: ProducerEffectsCreator<T>,
    payload: Record<string, any> | null,
    internalCallbacks: ProducerCallbacks<T> | undefined,
    execArgs: any[]
  ): AbortFn {
    this.willUpdate = true;

    if (this.state.status === AsyncStateStatus.pending || this.pendingUpdate) {
      if (this.pendingUpdate) {
        clearTimeout(this.pendingUpdate.timeoutId);
        // this.pendingUpdate.callback(); skip the callback!
        this.pendingUpdate = null;
      }
      this.abort();
      this.currentAbort = undefined;
    } else if (typeof this.currentAbort === "function") {
      this.abort();
    }

    if (isCacheEnabled(this)) {
      const topLevelParent: StateInterface<T> = getTopLevelParent(this);
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
            typeof topLevelParent.config.cacheConfig?.persist === "function"
          ) {
            topLevelParent.config.cacheConfig.persist(topLevelParent.cache);
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
    if (typeof this.currentAbort === "function") {
      this.currentAbort(reason);
    }
  }

  dispose() {
    if (this.locks > 0) {
      return false;
    }

    this.willUpdate = true;
    this.abort();

    this.locks = 0;
    const initialState = this.config.initialValue;
    const newState: State<T> = StateBuilder.initial(
      typeof initialState === "function" ? initialState.call(null, this.cache) : initialState
    );
    this.replaceState(newState);
    if (__DEV__) devtools.emitDispose(this);

    this.willUpdate = false;
    return true;
  }

  fork(forkConfig?: ForkConfig) {
    const mergedConfig: ForkConfig = shallowClone(defaultForkConfig, forkConfig);

    let {key} = mergedConfig;

    if (key === undefined) {
      key = `${this.key}-fork-${this.forksIndex + 1}`;
    }

    const clone = new AsyncState(key, this.originalProducer, this.config);

    // if something fail, no need to increment
    this.forksIndex += 1;

    if (mergedConfig.keepState) {
      clone.state = shallowClone(this.state);
      clone.lastSuccess = shallowClone(this.lastSuccess);
    }
    if (mergedConfig.keepCache) {
      clone.cache = this.cache;
    }

    return clone as StateInterface<T>;
  }

  mergePayload(partialPayload?: Record<string, any>): void {
    if (!this.payload) {
      this.payload = {}
    }
    this.payload = Object.assign(this.payload, partialPayload);
  }

  replaceCache(cacheKey: string, cache: CachedState<T>): void {
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

function cloneProducerProps<T>(props: ProducerProps<T>): ProducerSavedProps<T> {
  const output: ProducerSavedProps<T> = {
    lastSuccess: shallowClone(props.lastSuccess),
    payload: props.payload,
    args: props.args,
  };

  delete output.lastSuccess!.props;

  return output;
}

function constructPropsObject<T>(
  instance: StateInterface<T>,
  producerEffectsCreator: ProducerEffectsCreator<T>,
  internalCallbacks: ProducerCallbacks<T> | undefined,
  runIndicators: RunIndicators,
  payload: Record<string, any> | null,
  args: any[]
): ProducerProps<T> {


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
      if (typeof cb === "function") {
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
    updater: T | StateFunctionUpdater<T>,
    status?: AsyncStateStatus
  ): void {
    if (runIndicators.cleared && instance.state.status === AsyncStateStatus.aborted) {
      console.error("You are emitting while your producer is passing to aborted state." +
        "This has no effect and not supported by the library. The next " +
        "state value on aborted state is the reason of the abort.");
      return;
    }
    if (!runIndicators.fulfilled) {
      console.error("Called props.emit before the producer resolves. This is" +
        " not supported in the library and will have no effect");
      return;
    }
    instance.setState(updater, status);
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
        let abortedState = StateBuilder.aborted(reason, cloneProducerProps(props));
        instance.replaceState(abortedState);
        internalCallbacks?.onAborted?.(abortedState);
      }
    }

    runIndicators.cleared = true;
    onAbortCallbacks.forEach(function clean(func) {

      if (typeof func === "function") {
        func(reason);
      }
    });
    instance.currentAbort = undefined;
  }

}

export function createSource<T>(
  key: string,
  producer?: Producer<T> | undefined | null,
  config?: ProducerConfig<T>
): Source<T> {
  return new AsyncState(
    key,
    producer,
    config
  )._source;
}

const defaultForkConfig: ForkConfig = Object.freeze({keepState: false});
let uniqueId: number = 0;

function nextUniqueId() {
  return ++uniqueId;
}

function readInstanceFromSource<T>(possiblySource: Source<T>): StateInterface<T> {
  try {
    const candidate = possiblySource.constructor(asyncStatesKey);
    if (!(candidate instanceof AsyncState)) {
      throw new Error("");// error is thrown to trigger the catch block
    }
    return candidate; // async state instance
  } catch (e) {
    throw new Error("You ve passed an incompatible source object. Please make sure to pass the received source object.");
  }
}

function waitForAsyncCache<T>(
  instance: StateInterface<T>,
  promise: Promise<Record<string, CachedState<T>>>
) {
  promise.then(asyncCache => {
    resolveCache(instance, asyncCache);
  })
}

function resolveCache<T>(
  instance: StateInterface<T>,
  resolvedCache: Record<string, CachedState<T>>
) {
  instance.cache = resolvedCache;
  const cacheConfig = instance.config.cacheConfig;

  if (typeof cacheConfig!.onCacheLoad === "function") {
    cacheConfig!.onCacheLoad({
      cache: instance.cache,
      setState: instance.setState
    });
  }
}

function scheduleDelayedPendingUpdate<T>(
  instance: AsyncState<T>,
  newState: State<T>,
  notify: boolean
) {
  function callback() {
    // callback always sets the state with a pending status
    if (__DEV__) devtools.startUpdate(instance);
    instance.state = newState; // <-- status is pending!
    instance.pendingUpdate = null;
    if (__DEV__) devtools.emitUpdate(instance);

    if (notify) {
      notifySubscribers(instance as StateInterface<T>);
    }
  }

  const timeoutId = setTimeout(callback, instance.config.skipPendingDelayMs);
  instance.pendingUpdate = {callback, timeoutId};
}

function saveCacheAfterSuccessfulUpdate<T>(instance: StateInterface<T>) {
  const topLevelParent: StateInterface<T> = getTopLevelParent(instance);
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

    if (typeof topLevelParent.config.cacheConfig?.persist === "function") {
      topLevelParent.config.cacheConfig.persist(topLevelParent.cache);
    }

    spreadCacheChangeOnLanes(topLevelParent);
  }
}

function loadCache<T>(instance: StateInterface<T>) {
  if (
    !isCacheEnabled(instance) ||
    typeof instance.config.cacheConfig?.load !== "function"
  ) {
    return;
  }

  // inherit cache from the parent if exists!
  if (instance.parent !== null) {
    const topLevelParent: StateInterface<T> = getTopLevelParent(instance);
    instance.cache = topLevelParent.cache;
    return;
  }

  const loadedCache = instance.config.cacheConfig.load();

  if (!loadedCache) {
    return;
  }

  if (isPromise(loadedCache)) {
    waitForAsyncCache(instance, loadedCache as Promise<Record<string, CachedState<T>>>);
  } else {
    resolveCache(instance, loadedCache as Record<string, CachedState<T>>);
  }
}

function notifySubscribers(instance: StateInterface<any>) {
  if (!instance.subscriptions) {
    return;
  }
  Object.values(instance.subscriptions).forEach(subscription => {
    subscription.callback(instance.state);
  });
}

function getTopLevelParent<T>(base: StateInterface<T>): StateInterface<T> {
  let current = base;
  while (current.parent !== null) {
    current = current.parent;
  }
  return current;
}

function spreadCacheChangeOnLanes<T>(topLevelParent: StateInterface<T>) {
  if (!topLevelParent.lanes) {
    return;
  }
  Object.values(topLevelParent.lanes)
    .forEach(lane => {
      lane.cache = topLevelParent.cache;
      spreadCacheChangeOnLanes(lane);
    });
}

function makeSource<T>(instance: StateInterface<T>): Readonly<Source<T>> {
  const hiddenInstance = hideStateInstanceInNewObject(instance);

  const source: Source<T> = Object.assign(hiddenInstance, {
    key: instance.key,
    uniqueId: instance.uniqueId,

    abort: instance.abort,
    replay: instance.replay,
    getState: instance.getState,
    setState: instance.setState,
    getConfig: instance.getConfig,
    subscribe: instance.subscribe,
    getPayload: instance.getPayload,
    removeLane: instance.removeLane,
    patchConfig: instance.patchConfig,
    mergePayload: instance.mergePayload,
    replaceCache: instance.replaceCache,
    invalidateCache: instance.invalidateCache,
    replaceProducer: instance.replaceProducer,
    run: instance.run.bind(instance, standaloneProducerEffectsCreator),
    runp: instance.runp.bind(instance, standaloneProducerEffectsCreator),
    runc: instance.runc.bind(instance, standaloneProducerEffectsCreator),

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


function state<T>(
  status: AsyncStateStatus,
  data: T | any,
  props: ProducerSavedProps<T> | null
): State<T> {
  return Object.freeze({status, data, props, timestamp: Date.now()});
}

export const StateBuilder = Object.freeze({
  initial: (initialValue) => state(AsyncStateStatus.initial, initialValue, null),
  error: (
    data,
    props
  ) => state(AsyncStateStatus.error, data, props),
  success: (
    data,
    props
  ) => state(AsyncStateStatus.success, data, props),
  pending: props => state(AsyncStateStatus.pending, null, props),
  aborted: (
    reason,
    props
  ) => state(AsyncStateStatus.aborted, reason, props),
}) as StateBuilderInterface;
//endregion

//region producerEffects creators helpers

export function standaloneProducerRunEffectFunction<T>(
  input: ProducerRunInput<T>,
  config: ProducerRunConfig | null,
  ...args: any[]
) {
  if (isAsyncStateSource(input)) {
    let instance = readInstanceFromSource(input as Source<T>)
      .getLane(config?.lane);

    return instance.run(standaloneProducerEffectsCreator, ...args);

  } else if (typeof input === "function") {
    let instance = new AsyncState(nextKey(), input);
    if (config?.payload) {
      instance.mergePayload(config.payload)
    }
    return instance.run(standaloneProducerEffectsCreator, ...args);
  }
  return undefined;
}

export function standaloneProducerRunpEffectFunction<T>(
  props: ProducerProps<T>,
  input: ProducerRunInput<T>,
  config: ProducerRunConfig | null,
  ...args: any[]
) {

  if (isAsyncStateSource(input)) {
    let instance = readInstanceFromSource(input as Source<T>).getLane(config?.lane);
    return runWhileSubscribingToNextResolve(instance, props, args);
  } else if (typeof input === "function") {

    let instance = new AsyncState(nextKey(), input);
    if (config?.payload) {
      instance.mergePayload(config.payload);
    }
    return runWhileSubscribingToNextResolve(instance, props, args);

  } else {
    return undefined;
  }
}

export function runWhileSubscribingToNextResolve<T>(
  instance: StateInterface<T>,
  props: ProducerProps<T>,
  args
): Promise<State<T>> {
  return new Promise(resolve => {
    let unsubscribe = instance.subscribe(subscription);
    props.onAbort(unsubscribe);

    let abort = instance.run(standaloneProducerEffectsCreator, ...args);
    props.onAbort(abort);

    function subscription(newState: State<T>) {
      if (newState.status === AsyncStateStatus.success
        || newState.status === AsyncStateStatus.error) {
        if (typeof unsubscribe === "function") {
          unsubscribe();
        }
        resolve(newState);
      }
    }
  });
}

export function standaloneProducerSelectEffectFunction<T>(
  input: ProducerRunInput<T>,
  lane?: string,
) {
  if (isAsyncStateSource(input)) {
    return (input as Source<T>).getLaneSource(lane).getState()
  }
}

function standaloneProducerEffectsCreator<T>(props: ProducerProps<T>): ProducerEffects {
  return {
    run: standaloneProducerRunEffectFunction,
    select: standaloneProducerSelectEffectFunction,
    runp: standaloneProducerRunpEffectFunction.bind(null, props),
  };
}


//endregion

//region WRAP PRODUCER FUNCTION

export function wrapProducerFunction<T>(instance: StateInterface<T>): ProducerFunction<T> {
  // this is the real deal
  return function producerFuncImpl(
    props: ProducerProps<T>,
    indicators: RunIndicators,
    callbacks?: ProducerCallbacks<T>,
  ): undefined {

    // this allows the developer to omit the producer attribute.
    // and replaces state when there is no producer
    const currentProducer = instance.originalProducer;
    if (typeof currentProducer !== "function") {
      indicators.fulfilled = true;
      instance.producerType = ProducerType.notProvided;
      instance.setState(props.args[0], props.args[1]);
      if (callbacks) {
        switch (instance.state.status) {
          case AsyncStateStatus.success: {
            callbacks.onSuccess?.(instance.state);
            break;
          }
          case AsyncStateStatus.aborted: {
            callbacks.onAborted?.(instance.state);
            break;
          }
          case AsyncStateStatus.error: {
            callbacks.onError?.(instance.state);
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
      executionValue = currentProducer(props);
    } catch (e) {
      if (__DEV__) devtools.emitRunSync(instance, savedProps);
      indicators.fulfilled = true;
      let errorState = StateBuilder.error(e, savedProps);
      instance.replaceState(errorState);
      callbacks?.onError?.(errorState);
      return;
    }

    if (isGenerator(executionValue)) {
      instance.producerType = ProducerType.generator;
      if (__DEV__) devtools.emitRunGenerator(instance, savedProps);
      // generatorResult is either {done, value} or a promise
      let generatorResult;
      try {
        generatorResult = wrapStartedGenerator(executionValue, props, indicators);
      } catch (e) {
        indicators.fulfilled = true;
        let errorState = StateBuilder.error(e, savedProps);
        instance.replaceState(errorState);
        callbacks?.onError?.(errorState);
        return;
      }
      if (generatorResult.done) {
        indicators.fulfilled = true;
        let successState = StateBuilder.success(generatorResult.value, savedProps);
        instance.replaceState(successState);
        callbacks?.onSuccess?.(successState);
        return;
      } else {
        runningPromise = generatorResult;
        instance.suspender = runningPromise;
        instance.replaceState(StateBuilder.pending(savedProps) as State<any>);
      }
    } else if (isPromise(executionValue)) {
      instance.producerType = ProducerType.promise;
      if (__DEV__) devtools.emitRunPromise(instance, savedProps);
      runningPromise = executionValue;
      instance.suspender = runningPromise;
      instance.replaceState(StateBuilder.pending(savedProps) as State<any>);
    } else { // final value
      if (__DEV__) devtools.emitRunSync(instance, savedProps);
      indicators.fulfilled = true;
      instance.producerType = ProducerType.sync;
      let successState = StateBuilder.success(executionValue, savedProps);
      instance.replaceState(successState);
      callbacks?.onSuccess?.(successState);
      return;
    }

    runningPromise
      .then(stateData => {
        let aborted = indicators.aborted;
        if (!aborted) {
          indicators.fulfilled = true;
          let successState = StateBuilder.success(stateData, savedProps);
          instance.replaceState(successState);
          callbacks?.onSuccess?.(successState);
        }
      })
      .catch(stateError => {
        let aborted = indicators.aborted;
        if (!aborted) {
          indicators.fulfilled = true;
          let errorState = StateBuilder.error(stateError, savedProps);
          instance.replaceState(errorState);
          callbacks?.onError?.(errorState);
        }
      });
  };
}

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
export default AsyncState;
export {
  readInstanceFromSource,
  standaloneProducerEffectsCreator,
};
//endregion

//region TYPES

export interface BaseSource<T> {
  // identity
  key: string,
  uniqueId: number,

  getPayload(): Record<string, any>,

  mergePayload(partialPayload?: Record<string, any>),

  // state
  getState(): State<T>,

  setState(
    updater: StateFunctionUpdater<T> | T,
    status?: AsyncStateStatus,
  ): void;

  // subscriptions
  subscribe(cb: Function, subscriptionKey?: string): AbortFn,

  // producer
  replay(): AbortFn,

  abort(reason: any): void,

  replaceProducer(newProducer: Producer<any> | undefined),

  // cache
  invalidateCache(cacheKey?: string): void,

  replaceCache(cacheKey: string, cache: CachedState<T>): void,

  patchConfig(partialConfig: Partial<ProducerConfig<T>>),

  getConfig(): ProducerConfig<T>,
}

export interface StateInterface<T> extends BaseSource<T> {
  // identity
  version: number,
  _source: Source<T>,
  config: ProducerConfig<T>,
  payload: Record<string, any> | null,

  // state
  state: State<T>,
  lastSuccess: State<T>,

  replaceState(newState: State<T>, notify?: boolean): void,

  // subscriptions
  subsIndex: number;
  subscriptions: Record<number, StateSubscription<T>> | null,

  // producer
  producerType: ProducerType,
  producer: ProducerFunction<T>,
  suspender: Promise<T> | undefined,
  originalProducer: Producer<T> | undefined,

  willUpdate: boolean;
  currentAbort: AbortFn;

  // lanes and forks
  forksIndex: number,
  parent: StateInterface<T> | null,
  lanes: Record<string, StateInterface<T>> | null,

  // cache
  cache: Record<string, CachedState<T>> | null,

  // dev properties
  journal: any[], // for devtools, dev only

  // methods & overrides
  dispose(): boolean,

  getLane(laneKey?: string): StateInterface<T>,

  fork(forkConfig?: ForkConfig): StateInterface<T>,

  // lanes and forks
  removeLane(laneKey?: string): boolean,

  getLane(laneKey?: string): BaseSource<T>,

  fork(forkConfig?: ForkConfig): BaseSource<T>,

  runWithCallbacks(
    createProducerEffects: ProducerEffectsCreator<T>,
    callbacks: ProducerCallbacks<T> | undefined,
    args: any[]
  ),

  run(
    createProducerEffects: ProducerEffectsCreator<T>, ...args: any[]): AbortFn,

  runp(
    createProducerEffects: ProducerEffectsCreator<T>, ...args: any[]): Promise<State<T>>,

  runc(
    createProducerEffects: ProducerEffectsCreator<T>, props?: RUNCProps<T>): AbortFn,

}

export interface RUNCProps<T> extends ProducerCallbacks<T> {
  args?: any[],
}

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

export type OnAbortFn = (cb?: ((reason?: any) => void)) => void;

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

export type ProducerCallbacks<T> = {
  onAborted?(aborted: State<T>),
  onError?(errorState: State<T>),
  onSuccess?(successState: State<T>),
}

export type ProducerSavedProps<T> = {
  args?: any[],
  lastSuccess?: State<T>,
  payload?: Record<string, any> | null,
}

export type Producer<T> =
  ((props: ProducerProps<T>) => (T | Promise<T> | Generator<any, T, any>));

export type ProducerFunction<T> = (
  props: ProducerProps<T>,
  runIndicators: RunIndicators,
  internalCallbacks?: ProducerCallbacks<T>,
) => AbortFn;

export enum ProducerType {
  indeterminate = 0,
  sync = 1,
  promise = 2,
  generator = 3,
  notProvided = 4,
}

export type ProducerConfig<T> = {
  skipPendingStatus?: boolean,
  initialValue?: T | ((cache: Record<string, CachedState<T>>) => T),
  cacheConfig?: CacheConfig<T>,
  runEffectDurationMs?: number,
  runEffect?: ProducerRunEffects,
  skipPendingDelayMs?: number,
  resetStateOnDispose?: boolean,
}

export type StateFunctionUpdater<T> = (updater: State<T>) => T;

export type StateUpdater<T> = (
  updater: T | StateFunctionUpdater<T>,
  status?: AsyncStateStatus
) => void;

export interface Source<T> extends BaseSource<T> {
  run(...args: any[]): AbortFn,
  runp(...args: any[]): Promise<State<T>>,

  runc(props: RUNCProps<T>): AbortFn,

  removeLane(laneKey?: string): boolean,
  getLaneSource(laneKey?: string): Source<T>,
}

export type RunTask<T> = {
  args: any[],
  payload: Record<string, any> | null,
  producerEffectsCreator: ProducerEffectsCreator<T>,
}

export type StateSubscription<T> = {
  key: string, // subscription key
  cleanup: () => void,
  callback: (newState: State<T>) => void,
};

export type OnCacheLoadProps<T> = {
  cache: Record<string, CachedState<T>>,
  setState(
    newValue: T | StateFunctionUpdater<T>, status?: AsyncStateStatus): void
}

export type CacheConfig<T> = {
  enabled: boolean,
  getDeadline?(currentState: State<T>): number,
  hash?(args: any[] | undefined, payload: Record<string, any> | null): string,

  persist?(cache: Record<string, CachedState<T>>): void,
  load?(): Record<string, CachedState<T>> | Promise<Record<string, CachedState<T>>>,

  onCacheLoad?({cache, setState}: OnCacheLoadProps<T>): void,
}

export type CachedState<T> = {
  state: State<T>,
  addedAt: number,
  deadline: number,
}

export interface StateBuilderInterface {
  initial: <T> (initialValue: T) => State<T>,
  pending: <T>(props: ProducerSavedProps<T>) => State<T>,
  success: <T>(data: T, props: ProducerSavedProps<T>) => State<T>,
  error: <T>(data: any, props: ProducerSavedProps<T>) => State<any>,
  aborted: <T>(reason: any, props: ProducerSavedProps<T>) => State<any>,
}

export type ForkConfig = {
  key?: string,
  keepState?: boolean,
  keepCache?: boolean,
}

export type AsyncStateKeyOrSource<T> = string | Source<T>;

export interface ProducerEffects {
  run: <T>(
    input: ProducerRunInput<T>, config: ProducerRunConfig | null,
    ...args: any[]
  ) => AbortFn,

  runp: <T>(
    input: ProducerRunInput<T>, config: ProducerRunConfig | null,
    ...args: any[]
  ) => Promise<State<T>> | undefined,

  select: <T>(input: AsyncStateKeyOrSource<T>, lane?: string) => State<T> | undefined,
}

export type ProducerEffectsCreator<T> = (props: ProducerProps<T>) => ProducerEffects;

export type ProducerRunInput<T> = AsyncStateKeyOrSource<T> | Producer<T>;

export type ProducerRunConfig = {
  lane?: string,
  fork?: boolean,
  payload?: Record<string, any> | null,
};

export type PendingTimeout = { id: ReturnType<typeof setTimeout>, startDate: number };
export type PendingUpdate = { timeoutId: ReturnType<typeof setTimeout>, callback(): void };

//endregion
