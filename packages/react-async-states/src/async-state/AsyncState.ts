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
import {didNotExpire, hash, sourceIsSourceSymbol, StateBuilder} from "./utils";
import devtools from "devtools";
import {areRunEffectsSupported} from "shared/features";
import {
  AbortFn,
  AsyncStateInterface,
  AsyncStateKey,
  AsyncStateSource,
  AsyncStateStatus,
  CachedState,
  ForkConfig,
  Producer,
  ProducerConfig,
  ProducerEffectsCreator,
  ProducerFunction,
  ProducerProps,
  ProducerRunEffects,
  ProducerType,
  State,
  StateFunctionUpdater,
  StateSubscription
} from "./types";
import {constructAsyncStateSource} from "./construct-source";
import {standaloneProducerEffectsCreator} from "../helpers/producer-effects";

export default class AsyncState<T> implements AsyncStateInterface<T> {
  //region properties
  key: AsyncStateKey;
  _source: AsyncStateSource<T>;
  uniqueId: number | undefined;

  currentState: State<T>;
  lastSuccess: State<T>;
  producerType: ProducerType;

  config: ProducerConfig<T>;

  cache: Record<string, CachedState<T>> = Object.create(null);

  parent: AsyncStateInterface<T> | null;
  lanes: Record<string, AsyncStateInterface<T>>;

  private locks: number = 0;
  private forkCount: number = 0;
  payload: Record<string, any> | null = null;
  private pendingTimeout: { id: ReturnType<typeof setTimeout>, startDate: number } | null = null;

  private subscriptionsMeter: number = 0;
  subscriptions: { [id: number]: StateSubscription<T> } = {};

  producer: ProducerFunction<T>;
  suspender: Promise<T> | undefined = undefined;
  originalProducer: Producer<T> | undefined;
  private currentAborter: AbortFn = undefined;
  private latestRunTask: RunTask<T> | null = null;

  private pendingUpdate:
    { timeoutId: ReturnType<typeof setTimeout>, callback: () => void } | null = null;

  //endregion

  constructor(
    key: AsyncStateKey,
    producer: Producer<T> | undefined | null,
    config?: ProducerConfig<T>
  ) {
    this.key = key;
    this.config = shallowClone(config);
    this.originalProducer = producer ?? undefined;

    this.producer = wrapProducerFunction(this);
    this.producerType = ProducerType.indeterminate;

    if (__DEV__) {
      this.uniqueId = nextUniqueId();
    }

    this.parent = null;
    this.lanes = Object.create(null);

    this._source = makeSource(this);

    if (
      this.isCacheEnabled() &&
      typeof this.config.cacheConfig?.load === "function"
    ) {
      // if there is a parent (set with lane), take its cache
      if (this.parent !== null) {
        const topLevelParent: AsyncStateInterface<T> = getTopLevelParent(this);
        this.cache = topLevelParent.cache;
      } else {
        const loadedCache = this.config.cacheConfig.load();
        if (loadedCache) {
          if (isPromise(loadedCache)) {
            (loadedCache as Promise<Record<string, CachedState<T>>>)
              .then(asyncCache => {
                this.cache = asyncCache;
                if (typeof this.config.cacheConfig?.onCacheLoad === "function") {
                  this.config.cacheConfig.onCacheLoad({
                    cache: this.cache,
                    setState: this.replaceState.bind(this)
                  });
                }
              })
          } else {
            this.cache = loadedCache as Record<string, CachedState<T>>;

            if (typeof this.config.cacheConfig?.onCacheLoad === "function") {
              this.config.cacheConfig.onCacheLoad({
                cache: this.cache,
                setState: this.replaceState.bind(this)
              });
            }
          }
        }
      }
    }

    let initialState = this.config.initialValue;
    this.currentState = StateBuilder.initial(
      typeof initialState === "function" ? initialState.call(null, this.cache) : initialState
    );
    this.lastSuccess = this.currentState;

    Object.preventExtensions(this);

    if (__DEV__) devtools.emitCreation(this);
  }

  getState(): State<T> {
    return this.currentState;
  }

  replaceProducer(newProducer: Producer<any>) {
    this.originalProducer = newProducer ?? undefined;
    this.producer = wrapProducerFunction(this);
    this.producerType = ProducerType.indeterminate;
  }

  getLane(laneKey?: string): AsyncStateInterface<T> {
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


  isCacheEnabled(): boolean {
    return !!this.config.cacheConfig?.enabled;
  }

  setState(
    newState: State<T>,
    notify: boolean = true
  ): void {
    if (__DEV__) devtools.startUpdate(this);

    if (this.pendingUpdate) {
      clearTimeout(this.pendingUpdate.timeoutId);
      // this.pendingUpdate.callback(); skip the callback!
      this.pendingUpdate = null;
    }

    if (newState.status === AsyncStateStatus.pending) {
      if (
        areRunEffectsSupported()
        && this.config.skipPendingDelayMs
        && this.config.skipPendingDelayMs > 0
      ) {
        const that = this;

        function callback() {
          that.currentState = newState;
          that.pendingUpdate = null;

          if (notify) {
            notifySubscribers(that as AsyncStateInterface<any>);
          }
        }

        const timeoutId = setTimeout(callback, this.config.skipPendingDelayMs);
        this.pendingUpdate = {callback, timeoutId};
        return;
      }
    }

    this.currentState = newState;

    if (this.currentState.status === AsyncStateStatus.success) {
      this.lastSuccess = this.currentState;
      if (this.isCacheEnabled()) {
        const runHash = hash(
          this.currentState.props?.args,
          this.currentState.props?.payload,
          this.config.cacheConfig
        );
        if (this.cache[runHash]?.state !== this.currentState) {
          const topLevelParent: AsyncStateInterface<T> = getTopLevelParent(this);

          topLevelParent.cache[runHash] = {
            state: this.currentState,
            deadline: this.config.cacheConfig?.getDeadline?.(this.currentState) || Infinity,
            addedAt: Date.now(),
          };

          if (typeof topLevelParent.config.cacheConfig?.persist === "function") {
            topLevelParent.config.cacheConfig.persist(topLevelParent.cache);
          }

          spreadCacheChangeOnLanes(topLevelParent);
        }
      }
    }

    if (this.currentState.status !== AsyncStateStatus.pending) {
      this.suspender = undefined;
    }
    if (__DEV__) devtools.emitUpdate(this);

    if (notify) {
      notifySubscribers(this as AsyncStateInterface<any>);
    }
  }

  abort(reason: any = undefined) {
    invokeIfPresent(this.currentAborter, reason);
  }

  invalidateCache(cacheKey?: string) {
    if (this.isCacheEnabled()) {
      const topLevelParent:AsyncStateInterface<T> = getTopLevelParent(this);

      if (!cacheKey) {
        topLevelParent.cache = Object.create(null);
      } else {
        delete topLevelParent.cache[cacheKey];
      }

      if (typeof topLevelParent.config.cacheConfig?.persist === "function") {
        topLevelParent.config.cacheConfig.persist(topLevelParent.cache);
      }

      spreadCacheChangeOnLanes(topLevelParent);
    }
  }

  dispose() {
    if (this.locks > 0) {
      return false;
    }

    this.abort();

    this.locks = 0;
    const initialState = this.config.initialValue;
    const newState: State<T> = StateBuilder.initial(
      typeof initialState === "function" ? initialState.call(null, this.cache) : initialState
    );
    this.setState(newState);
    if (__DEV__) devtools.emitDispose(this);

    return true;
  }

  run(createProducerEffects: ProducerEffectsCreator<T>, ...args: any[]) {
    const effectDurationMs = numberOrZero(this.config.runEffectDurationMs);

    if (!areRunEffectsSupported() || !this.config.runEffect || effectDurationMs === 0) {
      return this.runImmediately(
        createProducerEffects,
        shallowClone(this.payload),
        ...args
      );
    } else {
      return this.runWithEffect(createProducerEffects,...args);
    }
  }

  private runWithEffect(
    createProducerEffects: ProducerEffectsCreator<T>,
    ...args: any[]
  ): AbortFn {

    const effectDurationMs = numberOrZero(this.config.runEffectDurationMs);

    const that = this;
    if (areRunEffectsSupported() && this.config.runEffect) {
      const now = Date.now();

      function registerTimeout() {
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
          return registerTimeout();
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
            return registerTimeout();
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
    if (this.currentState.status === AsyncStateStatus.pending || this.pendingUpdate) {
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
      const runHash = hash(execArgs, this.payload, this.config.cacheConfig);
      const cachedState = this.cache[runHash];

      if (cachedState) {
        if (didNotExpire(cachedState)) {
          if (cachedState.state !== this.currentState) {
            this.setState(cachedState.state);
          }
          return;
        } else {
          const topLevelParent: AsyncStateInterface<T> = getTopLevelParent(this);
          delete topLevelParent.cache[runHash];
          spreadCacheChangeOnLanes(topLevelParent);
        }
      }
    }

    const that = this;

    const runIndicators = {
      cleared: false,
      aborted: false,
      fulfilled: false,
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
        return that.currentState;
      }
    };
    Object.assign(props, createProducerEffects(props));

    function emit(
      updater: T | StateFunctionUpdater<T>,
      status?: AsyncStateStatus
    ): void {
      if (runIndicators.cleared && that.currentState.status === AsyncStateStatus.aborted) {
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
        // todo: we should be able to skip this update:
        // this abort function is passed as a part of the props to producer
        // the producer may be able to decide to **not run**
        // for example: trying to run when a condition such on a user input isn't met
        // rather than throwing, you can just decide **not to run**.
        // im not sure whether this function is the place to achieve this.
        that.setState(StateBuilder.aborted(reason, cloneProducerProps(props)));
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
    return abort;
  }

  subscribe(
    cb,
    subKey?: string | undefined
  ): AbortFn {
    let that = this;
    this.subscriptionsMeter += 1;
    // @ts-ignore
    let subscriptionKey: string = subKey;

    if (subKey === undefined) {
      subscriptionKey = `${this.key}-sub-${this.subscriptionsMeter}`;
    }

    function cleanup() {
      that.locks -= 1;
      delete that.subscriptions[subscriptionKey];
      if (__DEV__) devtools.emitUnsubscription(that, subscriptionKey);
      if (that.config.resetStateOnDispose === true) {
        if (Object.values(that.subscriptions).filter(Boolean).length === 0) {
          that.dispose();
        }
      }
    }

    this.subscriptions[subscriptionKey] = {
      cleanup,
      callback: cb,
      key: subscriptionKey,
    };
    this.locks += 1;

    if (__DEV__) devtools.emitSubscription(this, subscriptionKey);
    return cleanup;
  }

  fork(forkConfig?: ForkConfig) {
    const mergedConfig: ForkConfig = shallowClone(defaultForkConfig, forkConfig);

    let {key} = mergedConfig;

    if (key === undefined) {
      key = `${this.key}-fork-${this.forkCount + 1}`;
    }

    const clone = new AsyncState(key, this.originalProducer, this.config);

    // if something fail, no need to increment
    this.forkCount += 1;

    if (mergedConfig.keepState) {
      clone.currentState = shallowClone(this.currentState);
      clone.lastSuccess = shallowClone(this.lastSuccess);
    }
    if (mergedConfig.keepCache) {
      clone.cache = this.cache;
    }

    return clone as AsyncStateInterface<T>;
  }

  replaceState(
    newValue: T | StateFunctionUpdater<T>,
    status = AsyncStateStatus.success
  ): void {
    if (!StateBuilder[status]) {
      throw new Error(`Couldn't replace state to unknown status ${status}.`);
    }
    if (this.currentState?.status === AsyncStateStatus.pending) {
      this.abort();
      this.currentAborter = undefined;
    }

    let effectiveValue = newValue;
    if (isFn(newValue)) {
      effectiveValue = (newValue as StateFunctionUpdater<T>)(this.currentState);
    }


    if (__DEV__) devtools.emitReplaceState(this);
    // @ts-ignore
    const savedProps = cloneProducerProps({
      args: [effectiveValue],
      lastSuccess: this.lastSuccess,
      payload: shallowClone(this.payload),
    });
    this.setState(StateBuilder[status](effectiveValue, savedProps));
  }

  replay(): AbortFn {
    if (!this.latestRunTask) {
      return undefined;
    }
    return this.runImmediately(
      this.latestRunTask.producerEffectsCreator,
      this.latestRunTask.payload,
      ...this.latestRunTask.args
    );
  }
}

function nextUniqueId() {
  return ++uniqueId;
}

let uniqueId: number = 0;

const defaultForkConfig: ForkConfig = Object.freeze({keepState: false});

function makeSource<T>(asyncState: AsyncStateInterface<T>): Readonly<AsyncStateSource<T>> {
  const source: AsyncStateSource<T> = constructAsyncStateSource(asyncState);
  source.key = asyncState.key;

  Object.defineProperty(source, sourceIsSourceSymbol, {
    value: true,
    writable: false,
    enumerable: false,
    configurable: false,
  });

  if (__DEV__) {
    source.uniqueId = asyncState.uniqueId;
  }

  source.getLaneSource = function getLaneSource(lane?: string) {
    return asyncState.getLane(lane)._source;
  };
  source.getState = asyncState.getState.bind(asyncState);
  source.setState = asyncState.replaceState.bind(asyncState);
  source.invalidateCache = asyncState.invalidateCache.bind(asyncState);
  source.run = asyncState.run.bind(asyncState, standaloneProducerEffectsCreator);

  return Object.freeze(source);
}

function notifySubscribers(asyncState: AsyncStateInterface<any>) {
  Object.values(asyncState.subscriptions).forEach(subscription => {
    subscription.callback(asyncState.currentState);
  });
}

function getTopLevelParent<T>(base: AsyncStateInterface<T>): AsyncStateInterface<T> {
  let current = base;
  while (current.parent !== null) {
    current = current.parent;
  }
  return current;
}

function spreadCacheChangeOnLanes<T>(topLevelParent: AsyncStateInterface<T>) {
  Object.values(topLevelParent.lanes)
    .forEach(lane => {
      lane.cache = topLevelParent.cache;
      spreadCacheChangeOnLanes(lane);
    });
}

type RunTask<T> = {
  args: any[],
  payload: Record<string, any> | null,
  producerEffectsCreator: ProducerEffectsCreator<T>,
}
