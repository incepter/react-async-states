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
	PendingTimeout,
	PendingUpdate,
	PoolInterface,
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
import { pending, Status, success } from "./enums";
import {
	requestContext,
	warnAboutAlreadyExistingSourceWithSameKey,
} from "./pool";
import { StateBuilder } from "./helpers/StateBuilder";
import { nextUniqueId, shallowClone } from "./helpers/core";
import { runcInstance, runInstanceImmediately } from "./modules/StateRun";
import {
	getTopLevelParent,
	hasCacheEnabled,
	loadCache,
	spreadCacheChangeOnLanes,
} from "./modules/StateCache";
import {
	disposeInstance,
	replaceInstanceState,
	setInstanceState,
} from "./modules/StateUpdate";
import { attemptHydratedState } from "./modules/StateHydration";

// this is the main instance that will hold and manipulate the state
// it is referenced by its 'key' or name.
// when a state with the same name exists, it is returned instead of creating
// a new one.
export class AsyncState<T, E, R, A extends unknown[]>
	implements StateInterface<T, E, R, A>
{
	// used only in __DEV__ mode
	journal?: any[];

	readonly pool: PoolInterface;

	// this contains all methods, such as getState, setState and so on
	actions: Source<T, E, R, A>;

	key: string;
	uniqueId: number;
	version: number = 0;
	config: ProducerConfig<T, E, R, A>;
	payload: Record<string, any> | null;
	cache: Record<string, CachedState<T, E, R, A>> | null;

	parent: StateInterface<T, E, R, A> | null;
	lanes: Record<string, StateInterface<T, E, R, A>> | null;

	state: State<T, E, R, A>;
	queue: UpdateQueue<T, E, R, A> | null;
	latestRun: RunTask<T, E, R, A> | null;
	lastSuccess: LastSuccessSavedState<T, A>;

	promise: Promise<T> | null;
	currentAbort: AbortFn<R> | null;
	fn: Producer<T, E, R, A> | null;

	pendingUpdate: PendingUpdate | null;
	pendingTimeout: PendingTimeout | null;

	subsIndex: number | null;
	subscriptions: Record<number, StateSubscription<T, E, R, A>> | null;

	eventsIndex: number | null;
	events: InstanceEvents<T, E, R, A> | null;

	willUpdate: boolean | null;

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
			maybeInstance.actions.replaceProducer(producer || null);
			maybeInstance.actions.patchConfig(config);
			return maybeInstance;
		}

		if (__DEV__) {
			this.journal = [];
		}
		poolToUse.set(key, this);

		this.key = key;
		this.pool = poolToUse;
		this.fn = producer ?? null;
		this.uniqueId = nextUniqueId();
		this.actions = new StateSource(this);
		this.config = shallowClone(config);

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
		return disposeInstance(this.inst);
	}

	replaceProducer(newProducer: Producer<T, E, R, A> | null) {
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
		replaceInstanceState(this.inst, newState, notify, callbacks);
	}

	setState(
		newValue: T | StateFunctionUpdater<T, E, R, A>,
		status: Status = success,
		callbacks?: ProducerCallbacks<T, E, R, A>
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

export function createSource<
	T,
	E = unknown,
	R = unknown,
	A extends unknown[] = unknown[]
>(props: CreateSourceObject<T, E, R, A>): Source<T, E, R, A>;
export function createSource<
	T,
	E = unknown,
	R = unknown,
	A extends unknown[] = unknown[]
>(
	key: string,
	producer?: Producer<T, E, R, A> | undefined | null,
	config?: ProducerConfig<T, E, R, A>
): Source<T, E, R, A>;
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
	let instance: StateInterface<T, E, R, A>;

	if (typeof props === "object") {
		let { key, producer, config } = props;
		instance = new AsyncState(key, producer, config);
	} else {
		instance = new AsyncState(props, maybeProducer, maybeConfig);
	}

	return instance.actions;
}
