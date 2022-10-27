import {
  __DEV__,
  cloneProducerProps,
  invokeIfPresent,
  isFn,
  isPromise,
  numberOrZero,
  shallowClone,
  warning
} from "shared";
import {wrapProducerFunction} from "./wrap-producer-function";
import {
  asyncStatesKey,
  didNotExpire,
  hash,
  isAsyncStateSource,
  sourceIsSourceSymbol,
  StateBuilder
} from "./utils";
import devtools from "devtools";
import {areRunEffectsSupported} from "shared/features";
import {
  AbortFn,
  StateInterface,
  Source,
  AsyncStateStatus,
  CachedState,
  ForkConfig,
  Producer,
  ProducerConfig,
  ProducerEffects,
  ProducerEffectsCreator,
  ProducerFunction,
  ProducerProps,
  ProducerPropsRunConfig,
  ProducerPropsRunInput,
  ProducerRunEffects,
  ProducerType, RunTask,
  State,
  StateFunctionUpdater,
  StateSubscription, PendingUpdate, PendingTimeout
} from "./types";
import {constructAsyncStateSource} from "./construct-source";
import {
  AsyncStateKeyOrSource,
  AsyncStateManagerInterface
} from "../types.internal";
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

  parent: StateInterface<T> | null;
  lanes: Record<string, StateInterface<T>>;

  subscriptionsIndex: number = 0;
  subscriptions: Record<number, StateSubscription<T>> | null = null;

  producer: ProducerFunction<T>;
  suspender: Promise<T> | undefined = undefined;
  originalProducer: Producer<T> | undefined;

  pendingUpdate: PendingUpdate | null = null;

  private locks: number = 0;
  private forksIndex: number = 0;
  private pendingTimeout: PendingTimeout | null = null;

  private currentAborter: AbortFn = undefined;
  private latestRunTask: RunTask<T> | null = null;
  private willPerformStateUpdate: boolean = false;

  //endregion

  constructor(
    key: string,
    producer: Producer<T> | undefined | null,
    config?: ProducerConfig<T>
  ) {
    this.uniqueId = nextUniqueId();

    this.key = key;
    this.config = shallowClone(config);
    this.originalProducer = producer ?? undefined;

    this.producer = wrapProducerFunction(this);
    this.producerType = ProducerType.indeterminate;

    this.parent = null;
    this.lanes = Object.create(null);

    this._source = makeSource(this);

    if (__DEV__) {
      this.journal = [];
    }

    loadCache(this);

    let initialState = this.config.initialValue;
    this.state = StateBuilder.initial(
      typeof initialState === "function" ? initialState.call(null, this.cache) : initialState
    );
    this.lastSuccess = this.state;

    Object.preventExtensions(this);

    if (__DEV__) {
      devtools.emitCreation(this);
    }
  }

  getState(): State<T> {
    return this.state;
  }

  getLane(laneKey?: string): StateInterface<T> {
    if (!laneKey) {
      return this;
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

  setState(
    newState: State<T>,
    notify: boolean = true
  ): void {

    // pending update has always a pending status
    // setting the state should always clear this pending update
    // because it is stale, and we could safely skip it
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
      if (this.isCacheEnabled()) {
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
    this.subscriptionsIndex += 1;
    let subscriptionKey: string | undefined = subKey;

    if (subKey === undefined) {
      subscriptionKey = `subscription-$${this.subscriptionsIndex}`;
    }

    function cleanup() {
      that.locks -= 1;
      delete that.subscriptions![subscriptionKey!];
      if (__DEV__) devtools.emitUnsubscription(that, subscriptionKey);
      if (that.config.resetStateOnDispose === true) {
        if (Object.values(that.subscriptions!).filter(Boolean).length === 0) {
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

    if (__DEV__) devtools.emitSubscription(this, subscriptionKey);
    return cleanup;
  }

  replaceState(
    newValue: T | StateFunctionUpdater<T>,
    status = AsyncStateStatus.success
  ): void {
    if (!StateBuilder[status]) {
      throw new Error(`Couldn't replace state to unknown status ${status}.`);
    }
    this.willPerformStateUpdate = true;
    if (this.state?.status === AsyncStateStatus.pending) {
      this.abort();
      this.currentAborter = undefined;
    }

    let effectiveValue = newValue;
    if (isFn(newValue)) {
      effectiveValue = (newValue as StateFunctionUpdater<T>)(this.state);
    }
    // @ts-ignore
    const savedProps = cloneProducerProps({
      args: [effectiveValue],
      lastSuccess: this.lastSuccess,
      payload: shallowClone(this.payload),
    });
    if (__DEV__) devtools.emitReplaceState(this, savedProps);
    this.setState(StateBuilder[status](effectiveValue, savedProps));
    this.willPerformStateUpdate = false;
  }

  replay(): AbortFn {
    let latestRunTask = this.latestRunTask;
    if (!latestRunTask) {
      return undefined;
    }
    return this.runImmediately(
      latestRunTask.producerEffectsCreator,
      latestRunTask.payload,
      ...latestRunTask.args
    );
  }

  replaceProducer(newProducer: Producer<any>) {
    this.originalProducer = newProducer ?? undefined;
    this.producer = wrapProducerFunction(this);
    this.producerType = ProducerType.indeterminate;
  }

  isCacheEnabled(): boolean {
    return !!this.config.cacheConfig?.enabled;
  }

  invalidateCache(cacheKey?: string) {
    if (this.isCacheEnabled()) {
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
    const effectDurationMs = numberOrZero(this.config.runEffectDurationMs);

    if (
      !areRunEffectsSupported() ||
      !this.config.runEffect ||
      effectDurationMs === 0
    ) {
      return this.runImmediately(
        createProducerEffects,
        shallowClone(this.payload),
        ...args
      );
    }
    return this.runWithEffect(createProducerEffects, ...args);
  }

  private runWithEffect(
    createProducerEffects: ProducerEffectsCreator<T>,
    ...args: any[]
  ): AbortFn {

    const effectDurationMs = numberOrZero(this.config.runEffectDurationMs);

    const that = this;
    if (areRunEffectsSupported() && this.config.runEffect) {
      const now = Date.now();

      function scheduleDelayedRun() {
        let runAbortCallback: AbortFn | null = null;

        const timeoutId = setTimeout(function realRun() {
          that.pendingTimeout = null;
          runAbortCallback = that.runImmediately(
            createProducerEffects,
            shallowClone(that.payload),
            ...args
          );
        }, effectDurationMs);

        that.pendingTimeout = {
          id: timeoutId,
          startDate: now,
        };

        return function abortCleanup(reason) {
          clearTimeout(timeoutId);
          that.pendingTimeout = null;
          invokeIfPresent(runAbortCallback, reason);
        }
      }


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
          return scheduleDelayedRun();
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
            return scheduleDelayedRun();
          }
        }
      }
    }
    return this.runImmediately(createProducerEffects, shallowClone(this.payload), ...args);
  }

  private runImmediately(
    createProducerEffects: ProducerEffectsCreator<T>,
    payload: Record<string, any> | null,
    ...execArgs: any[]
  ): AbortFn {
    this.willPerformStateUpdate = true;
    if (this.state.status === AsyncStateStatus.pending || this.pendingUpdate) {
      if (this.pendingUpdate) {
        clearTimeout(this.pendingUpdate.timeoutId);
        // this.pendingUpdate.callback(); skip the callback!
        this.pendingUpdate = null;
      }
      this.abort();
      this.currentAborter = undefined;
    } else if (isFn(this.currentAborter)) {
      this.abort();
    }


    let onAbortCallbacks: AbortFn[] = [];

    if (this.isCacheEnabled()) {
      const topLevelParent: StateInterface<T> = getTopLevelParent(this);
      const runHash = hash(execArgs, this.payload, this.config.cacheConfig);

      const cachedState = topLevelParent.cache?.[runHash];

      if (cachedState) {
        if (didNotExpire(cachedState)) {
          if (cachedState.state !== this.state) {
            this.setState(cachedState.state);
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

    const that = this;

    const runIndicators = {
      cleared: false, // abort was called and abort callbacks were removed
      aborted: false, // aborted before fulfillment
      fulfilled: false, // resolved to something, either success or error
    };

    // @ts-ignore
    // ts yelling to add a run, runp and select functions
    // but run and runp will require access to this props object,
    // so they are constructed later, and appended to the same object.
    const props: ProducerProps<T> = {
      emit,
      abort,
      payload,
      args: execArgs,
      // todo: lastSuccess is error prone, since emit stays alive and may read a wrong result from here
      // but has low priority since getState returns the very current state
      lastSuccess: that.lastSuccess,
      onAbort(cb: AbortFn) {
        if (isFn(cb)) {
          onAbortCallbacks.push(cb);
        }
      },
      isAborted() {
        return runIndicators.aborted;
      },
      getState() {
        return that.state;
      }
    };
    Object.assign(props, createProducerEffects(props));

    function emit(
      updater: T | StateFunctionUpdater<T>,
      status?: AsyncStateStatus
    ): void {
      if (runIndicators.cleared && that.state.status === AsyncStateStatus.aborted) {
        warning("You are emitting while your producer is passing to aborted state." +
          "This has no effect and not supported by the library. The next " +
          "state value on aborted state is the reason of the abort.");
        return;
      }
      if (!runIndicators.fulfilled) {
        warning("Called props.emit before the producer resolves. This is" +
          " not supported in the library and will have no effect");
        return;
      }
      that.replaceState(updater, status);
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
        if (!that.willPerformStateUpdate) {
          that.setState(StateBuilder.aborted(reason, cloneProducerProps(props)));
        }
      }

      runIndicators.cleared = true;
      onAbortCallbacks.forEach(function clean(func) {
        invokeIfPresent(func, reason);
      });
      that.currentAborter = undefined;
    }

    this.currentAborter = abort;
    this.latestRunTask = {
      payload,
      args: execArgs,
      producerEffectsCreator: createProducerEffects,
    };
    this.producer(props, runIndicators);
    this.willPerformStateUpdate = false;
    return abort;
  }

  abort(reason: any = undefined) {
    invokeIfPresent(this.currentAborter, reason);
  }

  dispose() {
    if (this.locks > 0) {
      return false;
    }

    this.willPerformStateUpdate = true;
    this.abort();

    this.locks = 0;
    const initialState = this.config.initialValue;
    const newState: State<T> = StateBuilder.initial(
      typeof initialState === "function" ? initialState.call(null, this.cache) : initialState
    );
    this.setState(newState);
    if (__DEV__) devtools.emitDispose(this);

    this.willPerformStateUpdate = false;
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

  mergePayload(partialPayload: Record<string, any>): void {
    this.payload = Object.assign(this.payload, partialPayload);
  }

  replaceCache(cacheKey: string, cache: CachedState<T>): void {
    if (!this.isCacheEnabled()) {
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
const defaultForkConfig: ForkConfig = Object.freeze({keepState: false});
let uniqueId: number = 0;

function nextUniqueId() {
  return ++uniqueId;
}

function readAsyncStateFromSource<T>(possiblySource: Source<T>): StateInterface<T> {
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
  asyncState: StateInterface<T>,
  promise: Promise<Record<string, CachedState<T>>>
) {
  promise.then(asyncCache => {
    resolveCache(asyncState, asyncCache);
  })
}

function resolveCache<T>(
  asyncState: StateInterface<T>,
  resolvedCache: Record<string, CachedState<T>>
) {
  asyncState.cache = resolvedCache;
  const cacheConfig = asyncState.config.cacheConfig;

  if (typeof cacheConfig!.onCacheLoad === "function") {
    cacheConfig!.onCacheLoad({
      cache: asyncState.cache,
      setState: asyncState.replaceState.bind(asyncState)
    });
  }
}

function scheduleDelayedPendingUpdate<T>(
  asyncState: AsyncState<T>,
  newState: State<T>,
  notify: boolean
) {
  function callback() {
    // callback always sets the state with a pending status
    if (__DEV__) devtools.startUpdate(asyncState);
    asyncState.state = newState; // <-- status is pending!
    asyncState.pendingUpdate = null;
    if (__DEV__) devtools.emitUpdate(asyncState);

    if (notify) {
      notifySubscribers(asyncState as StateInterface<T>);
    }
  }

  const timeoutId = setTimeout(callback, asyncState.config.skipPendingDelayMs);
  asyncState.pendingUpdate = {callback, timeoutId};
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

function loadCache<T>(asyncState: AsyncState<T>) {
  if (
    !asyncState.isCacheEnabled() ||
    typeof asyncState.config.cacheConfig?.load !== "function"
  ) {
    return;
  }

  // inherit cache from the parent if exists!
  if (asyncState.parent !== null) {
    const topLevelParent: StateInterface<T> = getTopLevelParent(asyncState);
    asyncState.cache = topLevelParent.cache;
    return;
  }

  const loadedCache = asyncState.config.cacheConfig.load();

  if (!loadedCache) {
    return;
  }

  if (isPromise(loadedCache)) {
    waitForAsyncCache(asyncState, loadedCache as Promise<Record<string, CachedState<T>>>);
  } else {
    resolveCache(asyncState, loadedCache as Record<string, CachedState<T>>);
  }
}

function notifySubscribers(asyncState: StateInterface<any>) {
  if (!asyncState.subscriptions) {
    return;
  }
  Object.values(asyncState.subscriptions).forEach(subscription => {
    subscription.callback(asyncState.state);
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

function makeSource<T>(asyncState: StateInterface<T>): Readonly<Source<T>> {
  const source: Source<T> = constructAsyncStateSource(asyncState);
  source.key = asyncState.key;

  Object.defineProperty(source, sourceIsSourceSymbol, {
    value: true,
    writable: false,
    enumerable: false,
    configurable: false,
  });

  source.uniqueId = asyncState.uniqueId;

  source.getLaneSource = function getLaneSource(lane?: string) {
    return asyncState.getLane(lane)._source;
  };
  source.getState = asyncState.getState.bind(asyncState);
  source.setState = asyncState.replaceState.bind(asyncState);
  source.invalidateCache = asyncState.invalidateCache.bind(asyncState);
  source.run = asyncState.run.bind(asyncState, standaloneProducerEffectsCreator);
  source.subscribe = asyncState.subscribe.bind(asyncState);

  return Object.freeze(source);
}

//endregion

//region producerEffects creators helpers
function createRunFunction(
  manager: AsyncStateManagerInterface | null,
  _props: ProducerProps<any>
) {
  return function run<T>(
    input: ProducerPropsRunInput<T>,
    config: ProducerPropsRunConfig | null,
    ...args: any[]
  ): AbortFn {
    let asyncState: StateInterface<T> | undefined;
    const producerEffectsCreator =
      manager?.producerEffectsCreator || standaloneProducerEffectsCreator;

    if (isAsyncStateSource(input)) {
      asyncState = readAsyncStateFromSource(input as Source<T>).getLane(config?.lane);
    } else if (isFn(input)) {
      asyncState = new AsyncState(nextKey(), input as Producer<T>);
      if (config?.payload) {
        asyncState.payload = shallowClone(Object.create(null), config.payload);
      }
    } else if (manager !== null) {
      asyncState = manager.get(input as string);

      if (asyncState && config?.lane) {
        asyncState = asyncState.getLane(config.lane);
      }
    } else {
      return undefined;
    }

    if (!asyncState) {
      return undefined;
    }

    return asyncState.run(producerEffectsCreator, ...args);
  }
}

function createRunPFunction(manager, props) {
  return function runp<T>(
    input: ProducerPropsRunInput<T>,
    config: ProducerPropsRunConfig | null,
    ...args: any[]
  ): Promise<State<T>> | undefined {
    let asyncState: StateInterface<T>;
    const producerEffectsCreator =
      manager?.producerEffectsCreator || standaloneProducerEffectsCreator;

    if (isAsyncStateSource(input)) {
      asyncState = readAsyncStateFromSource(input as Source<T>).getLane(config?.lane);
    } else if (isFn(input)) {
      asyncState = new AsyncState(nextKey(), input as Producer<T>);
      if (config?.payload) {
        asyncState.payload = shallowClone(Object.create(null), config.payload);
      }
    } else {
      asyncState = manager?.get(input as string);

      if (config?.lane) {
        asyncState = asyncState.getLane(config.lane);
      }
    }

    if (!asyncState) {
      return undefined;
    }

    return new Promise(resolve => {
      let unsubscribe = asyncState.subscribe(subscription);
      props.onAbort(unsubscribe);

      let abort = asyncState.run(producerEffectsCreator, ...args);
      props.onAbort(abort);

      function subscription(newState: State<T>) {
        if (newState.status === AsyncStateStatus.success
          || newState.status === AsyncStateStatus.error) {
          invokeIfPresent(unsubscribe);
          resolve(newState);
        }
      }
    });
  }
}

function createSelectFunction<T>(manager: AsyncStateManagerInterface | null) {
  return function select(
    input: AsyncStateKeyOrSource<T>,
    lane?: string,
  ): State<T> | undefined {
    if (isAsyncStateSource(input)) {
      return readAsyncStateFromSource(input as Source<T>).getLane(lane).getState();
    }

    let managerAsyncState = manager?.get(input as string);
    if (!managerAsyncState) {
      return undefined;
    }
    return (managerAsyncState as StateInterface<T>).getLane(lane).getState();
  }
}

function createProducerEffectsCreator(manager: AsyncStateManagerInterface) {
  return function closeOverProps<T>(props: ProducerProps<T>): ProducerEffects {
    return {
      run: createRunFunction(manager, props),
      runp: createRunPFunction(manager, props),
      select: createSelectFunction(manager),
    };
  }
}

function standaloneProducerEffectsCreator<T>(props: ProducerProps<T>): ProducerEffects {
  return {
    run: createRunFunction(null, props),
    runp: createRunPFunction(null, props),
    select: createSelectFunction(null),
  };
}

//endregion

//region Exports
export default AsyncState;
export {
  createProducerEffectsCreator,
  readAsyncStateFromSource,
  standaloneProducerEffectsCreator,
};
//endregion
