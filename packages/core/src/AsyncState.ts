import {
	__DEV__,
	asyncStatesKey,
	cloneProducerProps,
	isFunction,
	isPromise,
	isServer,
	maybeWindow,
} from "./utils";
import devtools from "./devtools/Devtools";
import {
	AbortFn,
	AsyncStateSubscribeProps,
	CachedState,
	CreateSourceObject,
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
	PendingTimeout,
	PendingUpdate,
	PoolInterface,
	Producer,
	ProducerCallbacks,
	ProducerConfig,
	RUNCProps,
	RunTask,
	Source,
	SourcesType,
	State,
	StateFunctionUpdater,
	StateInterface,
	StateSubscription,
	UpdateQueue,
} from "./types";
import { pending, Status, success } from "./enums";
import {
	requestContext,
	warnAboutAlreadyExistingSourceWithSameKey,
} from "./pool";
import { sourceSymbol } from "./helpers/isSource";
import { StateBuilder } from "./helpers/StateBuilder";
import { freeze } from "./helpers/corejs";
import { runcInstance, runInstanceImmediately } from "./modules/StateRun";
import {
	invokeChangeCallbacks,
	invokeInstanceEvents,
} from "./modules/StateEvent";
import {
	hasCacheEnabled,
	loadCache,
	saveCacheAfterSuccessfulUpdate,
	spreadCacheChangeOnLanes,
} from "./modules/StateCache";

// this is the main instance that will hold and manipulate the state
// it is referenced by its 'key' or name.
// when a state with the same name exists, it is returned instead of creating
// a new one.
export class AsyncState<T, E, R, A extends unknown[]>
	implements StateInterface<T, E, R, A>
{
	journal?: any[]; // used only in dev mode

	actions: Source<T, E, R, A>;
	fn: Producer<T, E, R, A> | undefined;

	key: string;
	uniqueId: number;
	version: number = 0;
	payload?: Record<string, any>;
	config: ProducerConfig<T, E, R, A>;
	cache?: Record<string, CachedState<T, E, R, A>>;

	promise?: Promise<T>;
	currentAbort?: AbortFn<R>;
	state: State<T, E, R, A>;
	queue?: UpdateQueue<T, E, R, A>;

	lastSuccess: LastSuccessSavedState<T, A>;

	pendingUpdate: PendingUpdate | null;
	pendingTimeout: PendingTimeout | null;

	flushing?: boolean;
	eventsIndex?: number;
	events?: InstanceEvents<T, E, R, A>;

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
		config?: ProducerConfig<T, E, R, A>
	) {
		let ctx = config && config.context;
		let { poolInUse: poolToUse, getOrCreatePool } = requestContext(ctx);

		let poolName = config && config.pool;
		if (poolName) {
			poolToUse = getOrCreatePool(poolName);
		}

		let maybeInstance = poolToUse.instances.get(key) as
			| AsyncState<T, E, R, A>
			| undefined;

		if (maybeInstance) {
			if (__DEV__) {
				warnAboutAlreadyExistingSourceWithSameKey(key);
			}
			maybeInstance.actions.replaceProducer(producer || undefined);
			maybeInstance.actions.patchConfig(config);
			return maybeInstance;
		}

		if (__DEV__) {
			this.journal = [];
		}
		poolToUse.set(key, this);

		this.key = key;
		this.pool = poolToUse;
		this.uniqueId = nextUniqueId();
		this.actions = makeSource(this);
		this.config = shallowClone(config);
		this.fn = producer ?? undefined;

		loadCache(this);

		let maybeHydratedState = attemptHydratedState<T, E, R, A>(
			this.pool.name,
			this.key
		);
		if (maybeHydratedState) {
			this.state = maybeHydratedState.state;
			this.payload = maybeHydratedState.payload;
			this.latestRun = maybeHydratedState.latestRun;

			if (this.state.status === success) {
				this.lastSuccess = this.state;
			} else {
				let initializer = this.config.initialValue;
				let initialData = isFunction(initializer)
					? initializer(this.cache)
					: initializer;
				this.lastSuccess = StateBuilder.initial(
					initialData
				) as LastSuccessSavedState<T, A>;
				if (maybeHydratedState.state.status === pending) {
					this.promise = new Promise(() => {});
				}
			}
		} else {
			let initializer = this.config.initialValue;
			let initialData = isFunction(initializer)
				? initializer(this.cache)
				: (initializer as T);

			let initialState = StateBuilder.initial<T, A>(initialData);

			this.state = initialState;
			this.lastSuccess = initialState as LastSuccessSavedState<T, A>;
		}

		if (__DEV__) {
			devtools.emitCreation(this);
		}
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

function makeSource<T, E, R, A extends unknown[]>(
	instance: StateInterface<T, E, R, A>
): Readonly<Source<T, E, R, A>> {
	let source: Source<T, E, R, A> = new StateSource(instance);

	return freeze(source);
}

export function createSource<
	T,
	E = unknown,
	R = unknown,
	A extends unknown[] = unknown[]
>(
	props: string | CreateSourceObject<T, E, R, A>,
	maybeProducer?: Producer<T, E, R, A> | undefined | null,
	maybeConfig?: ProducerConfig<T, E, R, A>
): Source<T, E, R, A> {
	if (typeof props === "object") {
		return new AsyncState(props.key, props.producer, props.config).actions;
	}
	return new AsyncState(props, maybeProducer, maybeConfig).actions;
}

export function getSource(key: string, poolName?: string, context?: unknown) {
	let executionContext = requestContext(context);
	let pool = executionContext.getOrCreatePool(poolName);
	return pool.instances.get(key)?.actions;
}

export function readSource<T, E, R, A extends unknown[]>(
	possiblySource: Source<T, E, R, A>
): StateInterface<T, E, R, A> {
	let instance = possiblySource.inst;
	if (!instance) {
		throw new Error("Incompatible Source object.");
	}
	return instance;
}

function notifySubscribers<T, E, R, A extends unknown[]>(
	instance: StateInterface<T, E, R, A>
) {
	if (!instance.subscriptions) {
		return;
	}
	Object.values(instance.subscriptions).forEach((subscription) => {
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

function getTopLevelParent<T, E, R, A extends unknown[]>(
	base: StateInterface<T, E, R, A>
): StateInterface<T, E, R, A> {
	let current = base;
	while (current.parent) {
		current = current.parent;
	}
	return current;
}

function scheduleDelayedPendingUpdate<T, E, R, A extends unknown[]>(
	instance: StateInterface<T, E, R, A>,
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
	instance.pendingUpdate = { callback, id: timeoutId };
}

//endregion

//region UPDATE QUEUE
function getQueueTail<T, E, R, A extends unknown[]>(
	instance: StateInterface<T, E, R, A>
): UpdateQueue<T, E, R, A> | null {
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
	callbacks?: ProducerCallbacks<T, E, R, A>
) {
	let update: UpdateQueue<T, E, R, A> = {
		callbacks,
		kind: 1,
		data: { data: newValue, status },
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
	instance: StateInterface<T, E, R, A>
) {
	if (!instance.queue) {
		return;
	}

	let current: UpdateQueue<T, E, R, A> | null = instance.queue;

	delete instance.queue;

	instance.flushing = true;
	while (current !== null) {
		let {
			data: { status },
			callbacks,
		} = current;
		let canBailoutPendingStatus = status === pending && current.next !== null;

		if (canBailoutPendingStatus) {
			current = current.next;
		} else {
			if (current.kind === 0) {
				instance.actions.replaceState(current.data, undefined, callbacks);
			}
			if (current.kind === 1) {
				let {
					data: { data, status },
				} = current;
				instance.actions.setState(data, status, callbacks);
			}
			current = current.next;
		}
	}
	delete instance.flushing;
	notifySubscribers(instance);
}

//endregion

export class StateSource<T, E, R, A extends unknown[]>
	implements Source<T, E, R, A>
{
	key: string;
	uniqueId: number;
	readonly inst: StateInterface<T, E, R, A>;

	constructor(instance: StateInterface<T, E, R, A>) {
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
		eventHandler: InstanceChangeEventHandlerType<T, E, R, A>
	): () => void;
	on(
		eventType: InstanceDisposeEvent,
		eventHandler: InstanceDisposeEventHandlerType<T, E, R, A>
	): () => void;
	on(
		eventType: InstanceCacheChangeEvent,
		eventHandler: InstanceCacheChangeEventHandlerType<T, E, R, A>
	): () => void;
	on(
		eventType: InstanceEventType,
		eventHandler: InstanceEventHandlerType<T, E, R, A>
	): () => void {
		let instance = this.inst;

		if (!instance.events) {
			instance.events = {} as InstanceEvents<T, E, R, A>;
		}
		if (!instance.events[eventType]) {
			instance.events[eventType] = {};
		}

		let events = instance.events[eventType]!;

		if (!instance.eventsIndex) {
			instance.eventsIndex = 0;
		}
		let index = ++instance.eventsIndex;

		events[index] = eventHandler;

		return function () {
			delete events[index];
		};
	}

	run(...args: A) {
		return this.inst.actions.runc({ args });
	}

	runp(...args: A) {
		let instance = this.inst;
		return new Promise<State<T, E, R, A>>(function runpInstance(resolve) {
			let runcProps: RUNCProps<T, E, R, A> = {
				args,
				onError: resolve,
				onSuccess: resolve,
				onAborted: resolve,
			};

			runcInstance(instance, runcProps);
		});
	}

	runc(props?: RUNCProps<T, E, R, A>) {
		let instance = this.inst;
		return runcInstance(instance, props);
	}

	abort(reason: R | undefined = undefined) {
		let abortFn = this.inst.currentAbort;
		if (isFunction(abortFn)) {
			abortFn(reason);
		}
	}

	replay(): AbortFn<R> {
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
			const topLevelParent: StateInterface<T, E, R, A> =
				getTopLevelParent(instance);

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

	replaceCache(cacheKey: string, cache: CachedState<T, E, R, A>): void {
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

	getLane(laneKey?: string): Source<T, E, R, A> {
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

	getState(): State<T, E, R, A> {
		return this.inst.state;
	}

	getConfig(): ProducerConfig<T, E, R, A> {
		return this.inst.config;
	}

	patchConfig(partialConfig?: Partial<ProducerConfig<T, E, R, A>>) {
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
		let instance = this.inst;
		if (instance.subscriptions && Object.keys(instance.subscriptions).length) {
			// this means that this state is retained by some subscriptions
			return false;
		}
		instance.willUpdate = true;
		instance.actions.abort();
		if (instance.queue) {
			clearTimeout(instance.queue.id);
			delete instance.queue;
		}

		let initialState = instance.config.initialValue;
		if (isFunction(initialState)) {
			initialState = initialState(instance.cache || undefined);
		}
		const newState: State<T, E, R, A> = StateBuilder.initial<T, A>(
			initialState as T
		);
		instance.actions.replaceState(newState);
		if (__DEV__) devtools.emitDispose(instance);

		instance.willUpdate = false;
		invokeInstanceEvents(instance, "dispose");
		return true;
	}

	replaceProducer(newProducer: Producer<T, E, R, A> | undefined) {
		this.inst.fn = newProducer;
	}

	subscribe(cb: (s: State<T, E, R, A>) => void): AbortFn<R>;
	subscribe(subProps: AsyncStateSubscribeProps<T, E, R, A>): AbortFn<R>;
	subscribe(
		argv:
			| ((s: State<T, E, R, A>) => void)
			| AsyncStateSubscribeProps<T, E, R, A>
	): AbortFn<R> {
		let props = isFunction(argv) ? { cb: argv } : argv;
		if (!isFunction(props.cb)) {
			return;
		}

		let instance = this.inst;
		if (!instance.subsIndex) {
			instance.subsIndex = 0;
		}
		if (!instance.subscriptions) {
			instance.subscriptions = {};
		}

		instance.subsIndex += 1;

		let subscriptionKey: string | undefined = props.key;

		if (subscriptionKey === undefined) {
			subscriptionKey = `$${instance.subsIndex}`;
		}

		function cleanup() {
			delete instance.subscriptions![subscriptionKey!];
			if (__DEV__) devtools.emitUnsubscription(instance, subscriptionKey!);
			if (instance.config.resetStateOnDispose) {
				if (Object.values(instance.subscriptions!).length === 0) {
					instance.actions.dispose();
				}
			}
		}

		instance.subscriptions[subscriptionKey] = { props, cleanup };

		if (__DEV__) devtools.emitSubscription(instance, subscriptionKey);
		return cleanup;
	}

	replaceState(
		newState: State<T, E, R, A>,
		notify: boolean = true,
		callbacks?: ProducerCallbacks<T, E, R, A>
	): void {
		let instance = this.inst;
		let { config } = instance;
		let isPending = newState.status === pending;

		if (isPending && config.skipPendingStatus) {
			return;
		}

		if (instance.queue) {
			enqueueUpdate(instance, newState, callbacks);
			return;
		}

		if (
			config.keepPendingForMs &&
			instance.state.status === pending &&
			!instance.flushing
		) {
			enqueueUpdate(instance, newState, callbacks);
			return;
		}

		// pending update has always a pending status
		// setting the state should always clear this pending update
		// because it is stale, and we can safely skip it
		if (instance.pendingUpdate) {
			clearTimeout(instance.pendingUpdate.id);
			instance.pendingUpdate = null;
		}

		if (
			isPending &&
			instance.config.skipPendingDelayMs &&
			isFunction(setTimeout) &&
			instance.config.skipPendingDelayMs > 0
		) {
			scheduleDelayedPendingUpdate(instance, newState, notify);
			return;
		}

		if (__DEV__) devtools.startUpdate(instance);
		instance.state = newState;
		instance.version += 1;
		invokeChangeCallbacks(newState, callbacks);
		invokeInstanceEvents(instance, "change");
		if (__DEV__) devtools.emitUpdate(instance);

		if (instance.state.status === success) {
			instance.lastSuccess = instance.state;
			if (hasCacheEnabled(instance)) {
				saveCacheAfterSuccessfulUpdate(instance);
			}
		}

		if (!isPending) {
			instance.promise = undefined;
		}

		if (notify && !instance.flushing) {
			notifySubscribers(instance as StateInterface<T, E, R, A>);
		}
	}

	setState(
		newValue: T | StateFunctionUpdater<T, E, R, A>,
		status: Status = success,
		callbacks?: ProducerCallbacks<T, E, R, A>
	): void {
		if (!StateBuilder[status]) {
			throw new Error(`Unknown status ('${status}')`);
		}
		let instance = this.inst;
		if (instance.queue) {
			enqueueSetState(instance, newValue, status, callbacks);
			return;
		}
		instance.willUpdate = true;
		if (
			instance.state.status === pending ||
			(isFunction(instance.currentAbort) && !instance.isEmitting)
		) {
			instance.actions.abort();
			instance.currentAbort = undefined;
		}

		let effectiveValue = newValue;
		if (isFunction(newValue)) {
			effectiveValue = newValue(instance.state);
		}
		const savedProps = cloneProducerProps<T, E, R, A>({
			args: [effectiveValue] as A,
			payload: shallowClone(instance.payload),
		});
		if (__DEV__) devtools.emitReplaceState(instance, savedProps);
		// @ts-ignore
		let newState = StateBuilder[status](effectiveValue, savedProps) as State<
			T,
			E,
			R,
			A
		>;
		instance.actions.replaceState(newState, true, callbacks);
		instance.willUpdate = false;
	}

	getAllLanes() {
		let instance = this.inst;
		if (!instance.lanes) {
			return [];
		}
		return Object.values(instance.lanes).map((lane) => lane.actions);
	}
}
