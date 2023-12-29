import { __DEV__, isFunction } from "./utils";
import devtools from "./devtools/Devtools";
import {
  AbortFn,
  AsyncStateSubscribeProps,
  CachedState,
  CreateSourceObject,
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
  LibraryContext,
  PendingTimeout,
  PendingUpdate,
  Producer,
  ProducerCallbacks,
  ProducerConfig,
  RUNCProps,
  RunTask,
  Source,
  State,
  StateFunctionUpdater,
  StateInterface,
  StateSubscription,
  UpdateQueue,
} from "./types";
import { Status, success } from "./enums";
import { nextUniqueId, shallowClone } from "./helpers/core";
import { runcInstance, runInstanceImmediately } from "./modules/StateRun";
import {
  getTopLevelParent,
  hasCacheEnabled,
  persistAndSpreadCache,
  spreadCacheChangeOnLanes,
} from "./modules/StateCache";
import {
  disposeInstance,
  replaceInstanceState,
  setInstanceData,
  setInstanceState,
} from "./modules/StateUpdate";
import {
  subscribeToInstance,
  subscribeToInstanceEvent,
} from "./modules/StateSubscription";
import { requestContext } from "./modules/StateContext";
import { initializeInstance } from "./modules/StateInitialization";

// this is the main instance that will hold and manipulate the state
// it is referenced by its 'key' or name.
// when a state with the same name exists, it is returned instead of creating
// a new one.
export class AsyncState<T, A extends unknown[], E>
  implements StateInterface<T, A, E>
{
  readonly ctx: LibraryContext | null;

  // used only in __DEV__ mode
  journal?: any[];

  // this contains all methods, such as getState, setState and so on
  actions: Source<T, A, E>;

  id: number;
  key: string;
  version: number = 0;
  config: ProducerConfig<T, A, E>;
  payload: Record<string, any> | null;
  cache: Record<string, CachedState<T, A, E>> | null;

  parent: StateInterface<T, A, E> | null;
  lanes: Record<string, StateInterface<T, A, E>> | null;

  state: State<T, A, E>;
  queue: UpdateQueue<T, A, E> | null;
  latestRun: RunTask<T, A, E> | null;
  lastSuccess: LastSuccessSavedState<T, A>;

  promise: Promise<T> | null;
  currentAbort: AbortFn | null;
  fn: Producer<T, A, E> | null;

  pendingUpdate: PendingUpdate | null;
  pendingTimeout: PendingTimeout | null;

  subsIndex: number | null;
  subscriptions: Record<number, StateSubscription<T, A, E>> | null;

  eventsIndex: number | null;
  events: InstanceEvents<T, A, E> | null;

  constructor(
    key: string,
    producer: Producer<T, A, E> | undefined | null,
    config?: ProducerConfig<T, A, E>
  ) {
    let instanceConfig: ProducerConfig<T, A, E> = shallowClone(config);
    if (__DEV__) {
      // @ts-expect-error: getDeadline no longer exists
      if (instanceConfig.cacheConfig?.getDeadline !== undefined) {
        // @ts-ignore
        console.error(
          "[Warning][async state] getDeadline is deprecated in" +
            "favor of 'timeout' with the same signature, and supports now numbers. " +
            "state with key " +
            key +
            " has a cacheConfig.getDeadline configured"
        );
      }
    }

    // this means that the instance won't be stored in the LibraryContext
    // object, will be mostly used with anonymous instances
    if (instanceConfig.storeInContext !== false) {
      // fallback to globalContext (null)
      let context = config?.context || null;
      let libraryContext = requestContext(context);
      let existingInstance = libraryContext.get(key);

      // when an instance with the same key exists, reuse it
      if (existingInstance) {
        existingInstance.actions.patchConfig(config);
        existingInstance.actions.replaceProducer(producer || null);

        return existingInstance;
      }

      // start recording journal events early before end of creation
      if (__DEV__) {
        this.journal = [];
      }

      this.ctx = libraryContext;
      libraryContext.set(key, this);
    } else {
      this.ctx = null;
    }

    this.key = key;
    this.id = nextUniqueId();
    this.fn = producer ?? null;
    this.config = instanceConfig;
    this.actions = new StateSource(this);

    this.lanes = null;
    this.queue = null;
    this.cache = null;
    this.events = null;
    this.parent = null;
    this.promise = null;
    this.payload = null;
    this.latestRun = null;
    this.subsIndex = null;
    this.eventsIndex = null;
    this.currentAbort = null;
    this.subscriptions = null;
    this.pendingUpdate = null;
    this.pendingTimeout = null;

    // this function will loadCache if applied and also attempt
    // hydrated data if existing and also set the initial state
    // it was moved from here for simplicity and keep the constructor readable
    initializeInstance(this);

    if (__DEV__) devtools.emitCreation(this);
  }
}

export class StateSource<T, A extends unknown[], E> implements Source<T, A, E> {
  key: string;
  uniqueId: number;
  readonly inst: StateInterface<T, A, E>;

  constructor(instance: StateInterface<T, A, E>) {
    this.inst = instance;
    this.key = instance.key;
    this.uniqueId = instance.id;

    this.on = this.on.bind(this);
    this.run = this.run.bind(this);
    this.runp = this.runp.bind(this);
    this.runc = this.runc.bind(this);
    this.abort = this.abort.bind(this);
    this.replay = this.replay.bind(this);
    this.hasLane = this.hasLane.bind(this);
    this.getState = this.getState.bind(this);
    this.setData = this.setData.bind(this);
    this.setState = this.setState.bind(this);
    this.getConfig = this.getConfig.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.getPayload = this.getPayload.bind(this);
    this.removeLane = this.removeLane.bind(this);
    this.getVersion = this.getVersion.bind(this);
    this.patchConfig = this.patchConfig.bind(this);
    this.mergePayload = this.mergePayload.bind(this);
    this.replaceCache = this.replaceCache.bind(this);
    this.getLane = this.getLane.bind(this);
    this.invalidateCache = this.invalidateCache.bind(this);
    this.replaceProducer = this.replaceProducer.bind(this);
  }

  getState(): State<T, A, E> {
    return this.inst.state;
  }

  replaceState(
    newState: State<T, A, E>,
    notify: boolean = true,
    callbacks?: ProducerCallbacks<T, A, E>
  ): void {
    replaceInstanceState(this.inst, newState, notify, callbacks);
  }

  setState(
    newValue: T | StateFunctionUpdater<T, A, E>,
    status: Status = success,
    callbacks?: ProducerCallbacks<T, A, E>
  ): void {
    setInstanceState(this.inst, newValue, status, callbacks);
  }

  setData(newData: T | ((prev: T | null) => T)): void {
    setInstanceData(this.inst, newData);
  }

  on(
    eventType: InstanceChangeEvent,
    eventHandler: InstanceChangeEventHandlerType<T, A, E>
  ): () => void;
  on(
    eventType: InstanceDisposeEvent,
    eventHandler: InstanceDisposeEventHandlerType<T, A, E>
  ): () => void;
  on(
    eventType: InstanceCacheChangeEvent,
    eventHandler: InstanceCacheChangeEventHandlerType<T, A, E>
  ): () => void;
  on(
    eventType: InstanceEventType,
    eventHandler: InstanceEventHandlerType<T, A, E>
  ): () => void {
    return subscribeToInstanceEvent(this.inst, eventType, eventHandler);
  }

  run(...args: A) {
    return this.inst.actions.runc({ args });
  }

  runp(...args: A) {
    let instance = this.inst;
    return new Promise<State<T, A, E>>(function runpInstance(resolve) {
      let runcProps: RUNCProps<T, A, E> = {
        args,
        onError: resolve,
        onSuccess: resolve,
      };

      runcInstance(instance, runcProps);
    });
  }

  runc(props?: RUNCProps<T, A, E>) {
    let instance = this.inst;
    return runcInstance(instance, props);
  }

  abort(reason: any = undefined) {
    let abortFn = this.inst.currentAbort;
    if (isFunction(abortFn)) {
      abortFn(reason);
    }
  }

  replay(): AbortFn {
    let instance = this.inst;
    let latestRunTask = instance.latestRun;
    if (!latestRunTask) {
      return undefined;
    }
    let { args, payload } = latestRunTask;

    return runInstanceImmediately(instance, payload, { args });
  }

  invalidateCache(cacheKey?: string) {
    let instance = this.inst;
    if (hasCacheEnabled(instance)) {
      const topLevelParent: StateInterface<T, A, E> =
        getTopLevelParent(instance);

      if (!cacheKey) {
        topLevelParent.cache = {};
      } else if (topLevelParent.cache) {
        delete topLevelParent.cache[cacheKey];
      }

      persistAndSpreadCache(instance);
    }
  }

  replaceCache(cacheKey: string, cache: CachedState<T, A, E>): void {
    let instance = this.inst;
    if (!hasCacheEnabled(instance)) {
      return;
    }
    const topLevelParent = getTopLevelParent(instance);
    if (!topLevelParent.cache) {
      topLevelParent.cache = {};
    }
    topLevelParent.cache[cacheKey] = cache;
    spreadCacheChangeOnLanes(topLevelParent);
  }

  hasLane(laneKey: string): boolean {
    let instance = this.inst;
    if (!instance.lanes) {
      return false;
    }
    return !!instance.lanes[laneKey];
  }

  removeLane(laneKey?: string): boolean {
    let instance = this.inst;
    if (!instance.lanes || !laneKey) {
      return false;
    }
    return delete instance.lanes[laneKey];
  }

  getLane(laneKey?: string): Source<T, A, E> {
    if (!laneKey) {
      return this;
    }
    let instance = this.inst;
    if (!instance.lanes) {
      instance.lanes = {};
    }

    let existingLane = instance.lanes[laneKey];
    if (existingLane) {
      return existingLane.actions;
    }

    let producer = instance.fn;
    let config = Object.assign({}, instance.config);

    let newLane = new AsyncState(laneKey, producer, config);

    newLane.parent = instance;
    instance.lanes[laneKey] = newLane;

    return newLane.actions;
  }

  getVersion(): number {
    return this.inst.version;
  }

  getConfig(): ProducerConfig<T, A, E> {
    return this.inst.config;
  }

  patchConfig(partialConfig?: Partial<ProducerConfig<T, A, E>>) {
    Object.assign(this.inst.config, partialConfig);
  }

  getPayload(): Record<string, any> {
    let instance = this.inst;
    if (!instance.payload) {
      instance.payload = {};
    }
    return instance.payload;
  }

  mergePayload(partialPayload?: Record<string, any>): void {
    let instance = this.inst;
    if (!instance.payload) {
      instance.payload = {};
    }
    instance.payload = Object.assign(instance.payload, partialPayload);
  }

  dispose() {
    return disposeInstance(this.inst);
  }

  replaceProducer(newProducer: Producer<T, A, E> | null) {
    this.inst.fn = newProducer;
  }

  subscribe(cb: (s: State<T, A, E>) => void): AbortFn;
  subscribe(subProps: AsyncStateSubscribeProps<T, A, E>): AbortFn;
  subscribe(
    argv: ((s: State<T, A, E>) => void) | AsyncStateSubscribeProps<T, A, E>
  ): AbortFn {
    return subscribeToInstance(this.inst, argv);
  }

  getAllLanes() {
    let instance = this.inst;
    if (!instance.lanes) {
      return [];
    }
    return Object.values(instance.lanes).map((lane) => lane.actions);
  }
}

export function getSource<T, A extends unknown[], E>(
  key: string,
  context?: unknown
): Source<T, A, E> | undefined {
  let executionContext = requestContext(context || null);
  return executionContext.get(key)?.actions;
}

export function createSource<T, A extends unknown[] = [], E = Error>(
  props: CreateSourceObject<T, A, E>
): Source<T, A, E>;
export function createSource<T, A extends unknown[] = [], E = Error>(
  key: string,
  producer?: Producer<T, A, E> | undefined | null,
  config?: ProducerConfig<T, A, E>
): Source<T, A, E>;
export function createSource<T, A extends unknown[] = [], E = Error>(
  props: string | CreateSourceObject<T, A, E>,
  maybeProducer?: Producer<T, A, E> | undefined | null,
  maybeConfig?: ProducerConfig<T, A, E>
): Source<T, A, E> {
  let instance: StateInterface<T, A, E>;

  if (typeof props === "object") {
    let { key, producer, config } = props;
    instance = new AsyncState(key, producer, config);
  } else {
    instance = new AsyncState(props, maybeProducer, maybeConfig);
  }

  return instance.actions;
}
