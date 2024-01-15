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
  PromiseLike,
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
export class AsyncState<TData, TArgs extends unknown[], TError>
  implements StateInterface<TData, TArgs, TError>
{
  readonly ctx: LibraryContext | null;

  // used only in __DEV__ mode
  journal?: any[] | null  = null;

  // this contains all methods, such as getState, setState and so on
  actions: Source<TData, TArgs, TError>;

  id: number;
  key: string;
  version: number = 0;
  config: ProducerConfig<TData, TArgs, TError>;
  payload: Record<string, any> | null = null;
  cache: Record<string, CachedState<TData, TArgs, TError>> | null = null;

  parent: StateInterface<TData, TArgs, TError> | null = null;
  lanes: Record<string, StateInterface<TData, TArgs, TError>> | null = null;

  state: State<TData, TArgs, TError>;
  queue: UpdateQueue<TData, TArgs, TError> | null = null;
  latestRun: RunTask<TData, TArgs, TError> | null = null;
  lastSuccess: LastSuccessSavedState<TData, TArgs>;

  promise: PromiseLike<TData, TError> | null = null;
  currentAbort: AbortFn | null = null;
  fn: Producer<TData, TArgs, TError> | null = null;

  pendingUpdate: PendingUpdate | null = null;
  pendingTimeout: PendingTimeout | null = null;

  subsIndex: number | null = null;
  subscriptions: Record<number, StateSubscription<TData, TArgs, TError>> | null = null;

  eventsIndex: number | null = null;
  events: InstanceEvents<TData, TArgs, TError> | null = null;

  constructor(
    key: string,
    producer: Producer<TData, TArgs, TError> | undefined | null,
    config?: ProducerConfig<TData, TArgs, TError>
  ) {
    let instanceConfig: ProducerConfig<TData, TArgs, TError> =
      shallowClone(config);
    if (__DEV__) {
      // @ts-expect-error: getDeadline no longer exists
      if (instanceConfig.cacheConfig?.getDeadline !== undefined) {
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

    // this function will loadCache if applied and also attempt
    // hydrated data if existing and also set the initial state
    // it was moved from here for simplicity and keep the constructor readable
    initializeInstance(this);

    if (__DEV__) devtools.emitCreation(this);
  }
}

export class StateSource<TData, TArgs extends unknown[], TError>
  implements Source<TData, TArgs, TError>
{
  key: string;
  uniqueId: number;
  readonly inst: StateInterface<TData, TArgs, TError>;

  constructor(instance: StateInterface<TData, TArgs, TError>) {
    this.inst = instance;
    this.key = instance.key;
    this.uniqueId = instance.id;
  }

  getState = (): State<TData, TArgs, TError> => {
    return this.inst.state;
  };

  replaceState = (
    newState: State<TData, TArgs, TError>,
    notify: boolean = true,
    callbacks?: ProducerCallbacks<TData, TArgs, TError>
  ): void => {
    replaceInstanceState(this.inst, newState, notify, callbacks);
  };

  setState = (
    newValue:
      | TData
      | StateFunctionUpdater<TData, TArgs, TError>
      | null
      | TError,
    status: Status = success,
    callbacks?: ProducerCallbacks<TData, TArgs, TError>
  ): void => {
    setInstanceState(this.inst, newValue, status, callbacks);
  };

  setData = (newData: TData | ((prev: TData | null) => TData)): void => {
    setInstanceData(this.inst, newData);
  };

  on = (
    eventType: InstanceEventType,
    eventHandler: InstanceEventHandlerType<TData, TArgs, TError>
  ): (() => void) => {
    return subscribeToInstanceEvent(this.inst, eventType, eventHandler);
  };

  run = (...args: TArgs) => {
    return this.inst.actions.runc({ args });
  };

  runp = (...args: TArgs) => {
    let instance = this.inst;
    return new Promise<State<TData, TArgs, TError>>(function runpInstance(
      resolve
    ) {
      let runcProps: RUNCProps<TData, TArgs, TError> = {
        args,
        onError: resolve,
        onSuccess: resolve,
      };

      runcInstance(instance, runcProps);
    });
  };

  runc = (props?: RUNCProps<TData, TArgs, TError>) => {
    let instance = this.inst;
    return runcInstance(instance, props);
  };

  abort = (reason: any = undefined) => {
    let abortFn = this.inst.currentAbort;
    if (isFunction(abortFn)) {
      abortFn(reason);
    }
  };

  replay = (): AbortFn => {
    let instance = this.inst;
    let latestRunTask = instance.latestRun;
    if (!latestRunTask) {
      return undefined;
    }
    let { args, payload } = latestRunTask;

    return runInstanceImmediately(instance, payload, { args });
  };

  invalidateCache = (cacheKey?: string) => {
    let instance = this.inst;
    if (hasCacheEnabled(instance)) {
      const topLevelParent: StateInterface<TData, TArgs, TError> =
        getTopLevelParent(instance);

      if (!cacheKey) {
        topLevelParent.cache = {};
      } else if (topLevelParent.cache) {
        delete topLevelParent.cache[cacheKey];
      }

      persistAndSpreadCache(instance);
    }
  };

  replaceCache = (
    cacheKey: string,
    cache: CachedState<TData, TArgs, TError>
  ): void => {
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
  };

  hasLane = (laneKey: string): boolean => {
    let instance = this.inst;
    if (!instance.lanes) {
      return false;
    }
    return !!instance.lanes[laneKey];
  };

  removeLane = (laneKey?: string): boolean => {
    let instance = this.inst;
    if (!instance.lanes || !laneKey) {
      return false;
    }
    return delete instance.lanes[laneKey];
  };

  getLane = (laneKey?: string): Source<TData, TArgs, TError> => {
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
  };

  getVersion = (): number => {
    return this.inst.version;
  };

  getConfig = (): ProducerConfig<TData, TArgs, TError> => {
    return this.inst.config;
  };

  patchConfig = (
    partialConfig?: Partial<ProducerConfig<TData, TArgs, TError>>
  ) => {
    Object.assign(this.inst.config, partialConfig);
  };

  getPayload = (): Record<string, any> => {
    let instance = this.inst;
    if (!instance.payload) {
      instance.payload = {};
    }
    return instance.payload;
  };

  mergePayload = (partialPayload?: Record<string, any>): void => {
    let instance = this.inst;
    if (!instance.payload) {
      instance.payload = {};
    }
    instance.payload = Object.assign(instance.payload, partialPayload);
  };

  dispose = () => {
    return disposeInstance(this.inst);
  };

  replaceProducer = (newProducer: Producer<TData, TArgs, TError> | null) => {
    this.inst.fn = newProducer;
  };

  subscribe = (
    argv:
      | ((s: State<TData, TArgs, TError>) => void)
      | AsyncStateSubscribeProps<TData, TArgs, TError>
  ): AbortFn => {
    return subscribeToInstance(this.inst, argv);
  };

  getAllLanes = () => {
    let instance = this.inst;
    if (!instance.lanes) {
      return [];
    }
    return Object.values(instance.lanes).map((lane) => lane.actions);
  };
}

export function getSource<TData, TArgs extends unknown[], TError>(
  key: string,
  context?: unknown
): Source<TData, TArgs, TError> | undefined {
  let executionContext = requestContext(context || null);
  return executionContext.get(key)?.actions;
}

export function createSource<
  TData,
  TArgs extends unknown[] = [],
  TError = Error,
>(
  props: CreateSourceObject<TData, TArgs, TError>
): Source<TData, TArgs, TError>;
export function createSource<
  TData,
  TArgs extends unknown[] = [],
  TError = Error,
>(
  key: string,
  producer?: Producer<TData, TArgs, TError> | undefined | null,
  config?: ProducerConfig<TData, TArgs, TError>
): Source<TData, TArgs, TError>;
export function createSource<
  TData,
  TArgs extends unknown[] = [],
  TError = Error,
>(
  props: string | CreateSourceObject<TData, TArgs, TError>,
  maybeProducer?: Producer<TData, TArgs, TError> | undefined | null,
  maybeConfig?: ProducerConfig<TData, TArgs, TError>
): Source<TData, TArgs, TError> {
  let instance: StateInterface<TData, TArgs, TError>;

  if (typeof props === "object") {
    let { key, producer, config } = props;
    instance = new AsyncState(key, producer, config);
  } else {
    instance = new AsyncState(props, maybeProducer, maybeConfig);
  }

  return instance.actions;
}
