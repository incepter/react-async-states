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
import { hideStateInstanceInNewObject } from "./hide-object";
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

	_source: Source<T, E, R, A>;
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
		};
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

		let producer = this.fn;
		let config = shallowClone(this.config);
		let newLane = new AsyncState(laneKey, producer, config);

		newLane.parent = this;
		this.lanes[laneKey] = newLane;

		return newLane;
	}

	replaceState(
		newState: State<T, E, R, A>,
		notify: boolean = true,
		callbacks?: ProducerCallbacks<T, E, R, A>
	): void {
		let { config } = this;
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
			clearTimeout(this.pendingUpdate.id);
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
			if (hasCacheEnabled(this)) {
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

		if (!this.subsIndex) {
			this.subsIndex = 0;
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
			delete that.subscriptions![subscriptionKey!];
			if (__DEV__) devtools.emitUnsubscription(that, subscriptionKey!);
			if (that.config.resetStateOnDispose) {
				if (Object.values(that.subscriptions!).length === 0) {
					that.dispose();
				}
			}
		}

		this.subscriptions[subscriptionKey] = { props, cleanup };

		if (__DEV__) devtools.emitSubscription(this, subscriptionKey);
		return cleanup;
	}

	setState(
		newValue: T | StateFunctionUpdater<T, E, R, A>,
		status: Status = success,
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
		if (
			this.state.status === pending ||
			(isFunction(this.currentAbort) && !this.isEmitting)
		) {
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
		let newState = StateBuilder[status](effectiveValue, savedProps) as State<
			T,
			E,
			R,
			A
		>;
		this.replaceState(newState, true, callbacks);
		this.willUpdate = false;
	}

	replay(): AbortFn<R> {
		let latestRunTask = this.latestRun;
		if (!latestRunTask) {
			return undefined;
		}
		let { args, payload } = latestRunTask;

		return runInstanceImmediately(this, payload, { args });
	}

	replaceProducer(newProducer: Producer<T, E, R, A> | undefined) {
		this.fn = newProducer;
	}

	invalidateCache(cacheKey?: string) {
		if (hasCacheEnabled(this)) {
			const topLevelParent: StateInterface<T, E, R, A> =
				getTopLevelParent(this);

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
		return this.runc({ args });
	}

	runp(...args: A) {
		let instance = this;
		return new Promise<State<T, E, R, A>>(function runpInstance(resolve) {
			let runcProps = {
				args,
				onError: resolve,
				onSuccess: resolve,
				onAborted: resolve,
			};

			runcInstance(instance, runcProps);
		});
	}

	runc(props?: RUNCProps<T, E, R, A>) {
		let instance = this;
		return runcInstance(instance, props);
	}

	abort(reason: R | undefined = undefined) {
		if (isFunction(this.currentAbort)) {
			this.currentAbort(reason);
		}
	}

	dispose() {
		if (this.subscriptions && Object.keys(this.subscriptions).length) {
			// this means that this state is retained by some subscriptions
			return false;
		}
		this.willUpdate = true;
		this.abort();
		if (this.queue) {
			clearTimeout(this.queue.id);
			delete this.queue;
		}

		let initialState = this.config.initialValue;
		if (isFunction(initialState)) {
			initialState = initialState(this.cache);
		}
		const newState: State<T, E, R, A> = StateBuilder.initial<T, A>(
			initialState as T
		);
		this.replaceState(newState);
		if (__DEV__) devtools.emitDispose(this);

		this.willUpdate = false;
		invokeInstanceEvents(this, "dispose");
		return true;
	}

	mergePayload(partialPayload?: Record<string, any>): void {
		if (!this.payload) {
			this.payload = {};
		}
		this.payload = Object.assign(this.payload, partialPayload);
	}

	replaceCache(cacheKey: string, cache: CachedState<T, E, R, A>): void {
		if (!hasCacheEnabled(this)) {
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

function makeSource<T, E, R, A extends unknown[]>(
	instance: StateInterface<T, E, R, A>
): Readonly<Source<T, E, R, A>> {
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
			return Object.values(instance.lanes).map((lane) => lane._source);
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
		return new AsyncState(props.key, props.producer, props.config)._source;
	}
	return new AsyncState(props, maybeProducer, maybeConfig)._source;
}

export function getSource(key: string, poolName?: string, context?: unknown) {
	let executionContext = requestContext(context);
	let pool = executionContext.getOrCreatePool(poolName);
	return pool.instances.get(key)?._source;
}

export function readSource<T, E, R, A extends unknown[]>(
	possiblySource: Source<T, E, R, A>
): StateInterface<T, E, R, A> {
	try {
		const candidate = possiblySource.constructor(asyncStatesKey);
		if (!(candidate instanceof AsyncState)) {
			throw new Error(""); // error is thrown to trigger the catch block
		}
		return candidate; // async state instance
	} catch (e) {
		throw new Error("Incompatible Source object.");
	}
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
				instance.replaceState(current.data, undefined, callbacks);
			}
			if (current.kind === 1) {
				let {
					data: { data, status },
				} = current;
				instance.setState(data, status, callbacks);
			}
			current = current.next;
		}
	}
	delete instance.flushing;
	notifySubscribers(instance);
}

//endregion
