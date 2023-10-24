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
export class AsyncState<T, E, A extends unknown[]>
	implements StateInterface<T, E, A>
{
	readonly ctx: LibraryContext;

	// used only in __DEV__ mode
	journal?: any[];

	// this contains all methods, such as getState, setState and so on
	actions: Source<T, E, A>;

	key: string;
	uniqueId: number;
	version: number = 0;
	config: ProducerConfig<T, E, A>;
	payload: Record<string, any> | null;
	cache: Record<string, CachedState<T, E, A>> | null;

	parent: StateInterface<T, E, A> | null;
	lanes: Record<string, StateInterface<T, E, A>> | null;

	state: State<T, E, A>;
	queue: UpdateQueue<T, E, A> | null;
	latestRun: RunTask<T, E, A> | null;
	lastSuccess: LastSuccessSavedState<T, A>;

	promise: Promise<T> | null;
	currentAbort: AbortFn | null;
	fn: Producer<T, E, A> | null;

	pendingUpdate: PendingUpdate | null;
	pendingTimeout: PendingTimeout | null;

	subsIndex: number | null;
	subscriptions: Record<number, StateSubscription<T, E, A>> | null;

	eventsIndex: number | null;
	events: InstanceEvents<T, E, A> | null;

	constructor(
		key: string,
		producer: Producer<T, E, A> | undefined | null,
		config?: ProducerConfig<T, E, A>
	) {
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
		libraryContext.set(key, this);

		this.key = key;
		this.ctx = libraryContext;
		this.fn = producer ?? null;
		this.uniqueId = nextUniqueId();
		this.config = shallowClone(config);
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

		if (__DEV__) {
			devtools.emitCreation(this);
		}
	}
}

export class StateSource<T, E, A extends unknown[]> implements Source<T, E, A> {
	key: string;
	uniqueId: number;
	readonly inst: StateInterface<T, E, A>;

	constructor(instance: StateInterface<T, E, A>) {
		this.inst = instance;
		this.key = instance.key;
		this.uniqueId = instance.uniqueId;

		this.on = this.on.bind(this);
		this.run = this.run.bind(this);
		this.runp = this.runp.bind(this);
		this.runc = this.runc.bind(this);
		this.abort = this.abort.bind(this);
		this.replay = this.replay.bind(this);
		this.hasLane = this.hasLane.bind(this);
		this.getState = this.getState.bind(this);
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

	on(
		eventType: InstanceChangeEvent,
		eventHandler: InstanceChangeEventHandlerType<T, E, A>
	): () => void;
	on(
		eventType: InstanceDisposeEvent,
		eventHandler: InstanceDisposeEventHandlerType<T, E, A>
	): () => void;
	on(
		eventType: InstanceCacheChangeEvent,
		eventHandler: InstanceCacheChangeEventHandlerType<T, E, A>
	): () => void;
	on(
		eventType: InstanceEventType,
		eventHandler: InstanceEventHandlerType<T, E, A>
	): () => void {
		return subscribeToInstanceEvent(this.inst, eventType, eventHandler);
	}

	run(...args: A) {
		return this.inst.actions.runc({ args });
	}

	runp(...args: A) {
		let instance = this.inst;
		return new Promise<State<T, E, A>>(function runpInstance(resolve) {
			let runcProps: RUNCProps<T, E, A> = {
				args,
				onError: resolve,
				onSuccess: resolve,
			};

			runcInstance(instance, runcProps);
		});
	}

	runc(props?: RUNCProps<T, E, A>) {
		let instance = this.inst;
		return runcInstance(instance, props);
	}

	abort(reason: any | undefined = undefined) {
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
			const topLevelParent: StateInterface<T, E, A> =
				getTopLevelParent(instance);

			if (!cacheKey) {
				topLevelParent.cache = {};
			} else if (topLevelParent.cache) {
				delete topLevelParent.cache[cacheKey];
			}

			persistAndSpreadCache(instance);
		}
	}

	replaceCache(cacheKey: string, cache: CachedState<T, E, A>): void {
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

	getLane(laneKey?: string): Source<T, E, A> {
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

		// console.log("created shit", instance.lanes);

		return newLane.actions;
	}

	getVersion(): number {
		return this.inst.version;
	}

	getState(): State<T, E, A> {
		return this.inst.state;
	}

	getConfig(): ProducerConfig<T, E, A> {
		return this.inst.config;
	}

	patchConfig(partialConfig?: Partial<ProducerConfig<T, E, A>>) {
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

	replaceProducer(newProducer: Producer<T, E, A> | null) {
		this.inst.fn = newProducer;
	}

	subscribe(cb: (s: State<T, E, A>) => void): AbortFn;
	subscribe(subProps: AsyncStateSubscribeProps<T, E, A>): AbortFn;
	subscribe(
		argv: ((s: State<T, E, A>) => void) | AsyncStateSubscribeProps<T, E, A>
	): AbortFn {
		return subscribeToInstance(this.inst, argv);
	}

	replaceState(
		newState: State<T, E, A>,
		notify: boolean = true,
		callbacks?: ProducerCallbacks<T, E, A>
	): void {
		replaceInstanceState(this.inst, newState, notify, callbacks);
	}

	setState(
		newValue: T | StateFunctionUpdater<T, E, A>,
		status: Status = success,
		callbacks?: ProducerCallbacks<T, E, A>
	): void {
		setInstanceState(this.inst, newValue, status, callbacks);
	}

	getAllLanes() {
		let instance = this.inst;
		if (!instance.lanes) {
			return [];
		}
		return Object.values(instance.lanes).map((lane) => lane.actions);
	}
}

export function getSource<T, E, A extends unknown[]>(
	key: string,
	context?: unknown
): Source<T, E, A> | undefined {
	let executionContext = requestContext(context || null);
	return executionContext.get(key)?.actions;
}

export function readSource<T, E, A extends unknown[]>(
	possiblySource: Source<T, E, A>
): StateInterface<T, E, A> {
	let instance = possiblySource.inst;
	if (!instance) {
		throw new Error("Incompatible Source object.");
	}
	return instance;
}

export function createSource<T, E = unknown, A extends unknown[] = unknown[]>(
	props: CreateSourceObject<T, E, A>
): Source<T, E, A>;
export function createSource<T, E = unknown, A extends unknown[] = unknown[]>(
	key: string,
	producer?: Producer<T, E, A> | undefined | null,
	config?: ProducerConfig<T, E, A>
): Source<T, E, A>;
export function createSource<T, E = unknown, A extends unknown[] = unknown[]>(
	props: string | CreateSourceObject<T, E, A>,
	maybeProducer?: Producer<T, E, A> | undefined | null,
	maybeConfig?: ProducerConfig<T, E, A>
): Source<T, E, A> {
	let instance: StateInterface<T, E, A>;

	if (typeof props === "object") {
		let { key, producer, config } = props;
		instance = new AsyncState(key, producer, config);
	} else {
		instance = new AsyncState(props, maybeProducer, maybeConfig);
	}

	return instance.actions;
}
