import { RunEffect, Status } from "./enums";

export type ProducerWrapperInput<T, E, R, A extends unknown[]> = {
	setState: StateUpdater<T, E, R, A>;
	instance?: StateInterface<T, E, R, A>;
	setSuspender(p: Promise<T>): void;
	replaceState(
		newState: State<T, E, R, A>,
		notify?: boolean,
		callbacks?: ProducerCallbacks<T, E, R, A>
	);
	getProducer(): Producer<T, E, R, A> | undefined | null;
};

export interface BaseSource<T, E, R, A extends unknown[]> {
	// identity
	key: string;
	uniqueId: number;

	getVersion(): number;

	getPayload(): Record<string, unknown>;

	mergePayload(partialPayload?: Record<string, unknown>);

	// state
	getState(): State<T, E, R, A>;

	// todo: overload this!!!!
	setState(
		updater: StateFunctionUpdater<T, E, R, A> | T,
		status?: Status,
		callbacks?: ProducerCallbacks<T, E, R, A>
	): void;

	// subscriptions
	subscribe(cb: (s: State<T, E, R, A>) => void): AbortFn<R>;

	subscribe(subProps: AsyncStateSubscribeProps<T, E, R, A>): AbortFn<R>;

	subscribe(
		argv:
			| ((s: State<T, E, R, A>) => void)
			| AsyncStateSubscribeProps<T, E, R, A>
	): AbortFn<R>;

	// producer
	replay(): AbortFn<R>;

	abort(reason?: R): void;

	replaceProducer(newProducer: Producer<T, E, R, A> | undefined);

	// cache
	invalidateCache(cacheKey?: string): void;

	replaceCache(cacheKey: string, cache: CachedState<T, E, R, A>): void;

	patchConfig(partialConfig?: Partial<ProducerConfig<T, E, R, A>>);

	getConfig(): ProducerConfig<T, E, R, A>;

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
}

export type InstanceEventHandlerType<T, E, R, A extends unknown[]> =
	| InstanceChangeEventHandlerType<T, E, R, A>
	| InstanceDisposeEventHandlerType<T, E, R, A>
	| InstanceCacheChangeEventHandlerType<T, E, R, A>;
export type StateChangeEventHandler<T, E, R, A extends unknown[]> =
	| ((newState: State<T, E, R, A>) => void)
	| InstanceChangeEventObject<T, E, R, A>;
export type InstanceChangeEventObject<T, E, R, A extends unknown[]> = {
	status: Status;
	handler: (newState: State<T, E, R, A>) => void;
};
export type InstanceChangeEventHandlerType<T, E, R, A extends unknown[]> =
	| StateChangeEventHandler<T, E, R, A>
	| StateChangeEventHandler<T, E, R, A>[];
export type InstanceDisposeEventHandlerType<T, E, R, A extends unknown[]> =
	| (() => void)
	| (() => void)[];
export type InstanceCacheChangeEventHandlerType<T, E, R, A extends unknown[]> =
	| ((
			cache: Record<string, CachedState<T, E, R, A>> | null | undefined
	  ) => void)
	| ((
			cache: Record<string, CachedState<T, E, R, A>> | null | undefined
	  ) => void)[];
export type InstanceChangeEvent = "change";
export type InstanceDisposeEvent = "dispose";
export type InstanceCacheChangeEvent = "cache-change";
export type InstanceEventType =
	| InstanceChangeEvent
	| InstanceDisposeEvent
	| InstanceCacheChangeEvent;
export type AsyncStateSubscribeProps<T, E, R, A extends unknown[]> = {
	key?: string;
	flags?: number;
	cb(s: State<T, E, R, A>): void;
};
export type InstanceEvents<T, E, R, A extends unknown[]> = {
	change?: Record<number, InstanceChangeEventHandlerType<T, E, R, A>>;
	dispose?: Record<number, InstanceDisposeEventHandlerType<T, E, R, A>>;
	["cache-change"]?: Record<
		number,
		InstanceCacheChangeEventHandlerType<T, E, R, A>
	>;
};

export type HydrationData<T, E, R, A extends unknown[]> = {
	state: State<T, E, R, A>;
	payload: Record<string, unknown>;
	latestRun?: RunTask<T, E, R, A> | null;
};

export interface StateInterface<T, E, R, A extends unknown[]>
	extends BaseSource<T, E, R, A> {
	// identity
	version: number;
	_source: Source<T, E, R, A>;
	config: ProducerConfig<T, E, R, A>;
	payload?: Record<string, unknown> | null;

	// state
	state: State<T, E, R, A>;
	lastSuccess: LastSuccessSavedState<T, A>;

	pendingUpdate: PendingUpdate | null;
	pendingTimeout: PendingTimeout | null;

	queue?: UpdateQueue<T, E, R, A>;
	flushing?: boolean;
	replaceState(
		newState: State<T, E, R, A>,
		notify?: boolean,
		callbacks?: ProducerCallbacks<T, E, R, A>
	): void;

	// subscriptions
	subsIndex?: number;
	subscriptions?: Record<number, StateSubscription<T, E, R, A>> | null;

	// producer
	promise?: Promise<T>;
	fn: Producer<T, E, R, A> | undefined | null;
	pool: PoolInterface;

	request?: Request;

	isEmitting?: boolean;
	willUpdate?: boolean;

	latestRun?: RunTask<T, E, R, A> | null;
	currentAbort?: AbortFn<R>;

	// lanes and forks
	forksIndex?: number;
	parent?: StateInterface<T, E, R, A> | null;
	lanes?: Record<string, StateInterface<T, E, R, A>> | null;

	// cache
	cache?: Record<string, CachedState<T, E, R, A>> | null;

	events?: InstanceEvents<T, E, R, A>;
	eventsIndex?: number;
	// dev properties
	journal?: any[]; // for devtools, dev only

	// methods & overrides
	dispose(): boolean;

	hasLane(laneKey: string): boolean;

	getLane(laneKey?: string): StateInterface<T, E, R, A>;

	fork(forkConfig?: ForkConfig): StateInterface<T, E, R, A>;

	// lanes and forks
	removeLane(laneKey?: string): boolean;

	getLane(laneKey?: string): BaseSource<T, E, R, A>;

	fork(forkConfig?: ForkConfig): BaseSource<T, E, R, A>;

	run(...args: A): AbortFn<R>;

	runp(...args: A): Promise<State<T, E, R, A>>;

	runc(props?: RUNCProps<T, E, R, A>): AbortFn<R>;
}

export interface RUNCProps<T, E, R, A extends unknown[]>
	extends ProducerCallbacks<T, E, R, A> {
	args?: A;
}

export type LastSuccessSavedState<T, A extends unknown[]> =
	| InitialState<T, A>
	| SuccessState<T, A>;

export interface BaseState<T, A extends unknown[]> {
	data: T;
	status: Status;
	timestamp: number;
	props?: ProducerSavedProps<T, A> | null;
}

export type SuccessState<T, A extends unknown[]> = {
	data: T;
	timestamp: number;
	status: Status.success;
	props: ProducerSavedProps<T, A>;
};
export type ErrorState<T, E, A extends unknown[]> = {
	data: E;
	timestamp: number;
	status: Status.error;
	props: ProducerSavedProps<T, A>;
};
export type PendingState<T, A extends unknown[]> = {
	data: null;
	timestamp: number;
	status: Status.pending;
	props: ProducerSavedProps<T, A>;
};
export type InitialState<T, A extends unknown[]> = {
	timestamp: number;
	data: T | undefined;
	status: Status.initial;
	props: ProducerSavedProps<T, A> | null;
};
export type AbortedState<T, E, R, A extends unknown[]> = {
	data: R;
	timestamp: number;
	status: Status.aborted;
	props: ProducerSavedProps<T, A>;
};
export type State<T, E, R, A extends unknown[]> =
	| InitialState<T, A>
	| PendingState<T, A>
	| AbortedState<T, E, R, A>
	| SuccessState<T, A>
	| ErrorState<T, E, A>;
export type AbortFn<R = unknown> = ((reason?: R) => void) | undefined;
export type OnAbortFn<R = unknown> = (cb?: (reason?: R) => void) => void;

export interface ProducerProps<T, E, R, A extends unknown[]>
	extends ProducerEffects {
	abort: AbortFn<R>;
	onAbort: OnAbortFn;
	emit: StateUpdater<T, E, R, A>;

	args: A;
	payload: Record<string, unknown>;
	lastSuccess: LastSuccessSavedState<T, A>;
	isAborted: () => boolean;

	getState: () => State<T, E, R, A>;

	signal: AbortSignal;
}

export type RunIndicators = {
	index: number;
	done: boolean;
	cleared: boolean;
	aborted: boolean;
};
export type ProducerCallbacks<T, E, R, A extends unknown[]> = {
	onError?(errorState: ErrorState<T, E, A>): void;
	onSuccess?(successState: SuccessState<T, A>): void;
	onAborted?(aborted: AbortedState<T, E, R, A>): void;
};
export type ProducerSavedProps<T, A extends unknown[]> = {
	args?: A;
	payload?: Record<string, unknown> | null;
};
export type Producer<T, E, R, A extends unknown[]> = (
	props: ProducerProps<T, E, R, A>
) => T | Promise<T> | Generator<any, T, any>;
export type ProducerFunction<T, E, R, A extends unknown[]> = (
	props: ProducerProps<T, E, R, A>,
	runIndicators: RunIndicators,
	callbacks?: ProducerCallbacks<T, E, R, A>
) => AbortFn<R>;
export type ProducerConfig<T, E, R, A extends unknown[]> = {
	skipPendingStatus?: boolean;
	initialValue?: T | ((cache?: Record<string, CachedState<T, E, R, A>>) => T);
	cacheConfig?: CacheConfig<T, E, R, A>;
	runEffectDurationMs?: number;
	runEffect?: RunEffect;
	keepPendingForMs?: number;
	skipPendingDelayMs?: number;
	resetStateOnDispose?: boolean;
	context?: unknown;

	pool?: string;

	// dev only
	hideFromDevtools?: boolean;
	retryConfig?: RetryConfig<T, E, R, A>;
};

export type RetryConfig<T, E, R, A extends unknown[]> = {
	enabled: boolean;
	maxAttempts?: number;
	backoff?: number | ((attemptIndex: number, error: E) => number);
	retry?: boolean | ((attemptIndex: number, error: E) => boolean);
};

export type StateFunctionUpdater<T, E, R, A extends unknown[]> = (
	updater: State<T, E, R, A>
) => T;
export type StateUpdater<T, E, R, A extends unknown[]> = (
	updater: StateFunctionUpdater<T, E, R, A> | T,
	status?: Status,
	callbacks?: ProducerCallbacks<T, E, R, A>
) => void;

export type CreateSourceObject<T, E, R, A extends unknown[]> = {
	key: string;
	config?: ProducerConfig<T, E, R, A>;
	producer?: Producer<T, E, R, A> | null;
};

export type CreateSourceType = {
	<T, E, R, A extends unknown[]>(props: CreateSourceObject<T, E, R, A>): Source<
		T,
		E,
		R,
		A
	>;
	<T, E, R, A extends unknown[]>(
		key: string,
		producer?: Producer<T, E, R, A> | undefined | null,
		config?: ProducerConfig<T, E, R, A>
	): Source<T, E, R, A>;
	<T, E, R, A extends unknown[]>(
		props: string | CreateSourceObject<T, E, R, A>,
		maybeProducer?: Producer<T, E, R, A> | undefined | null,
		maybeConfig?: ProducerConfig<T, E, R, A>
	): Source<T, E, R, A>;
};

export type SourcesType = {
	<T, E, R, A extends unknown[]>(): Source<T, E, R, A>;
	for: CreateSourceType;
	of<T, E, R, A extends unknown[]>(
		key: string,
		pool?: string,
		context?: unknown
	);
};

export interface Source<T, E, R, A extends unknown[]>
	extends BaseSource<T, E, R, A> {
	run(...args: A): AbortFn<R>;

	runp(...args: A): Promise<State<T, E, R, A>>;

	runc(props: RUNCProps<T, E, R, A>): AbortFn<R>;

	hasLane(laneKey: string): boolean;

	removeLane(laneKey?: string): boolean;

	getLaneSource(laneKey?: string): Source<T, E, R, A>;

	getAllLanes(): Source<T, E, R, A>[];
}

export type RunTask<T, E, R, A extends unknown[]> = {
	args: A;
	payload: Record<string, unknown>;
};
export type StateSubscription<T, E, R, A extends unknown[]> = {
	cleanup: () => void;
	props: AsyncStateSubscribeProps<T, E, R, A>;
};
export type OnCacheLoadProps<T, E, R, A extends unknown[]> = {
	cache: Record<string, CachedState<T, E, R, A>>;
	setState(
		newValue: T | StateFunctionUpdater<T, E, R, A>,
		status?: Status
	): void;
};
export type CacheConfig<T, E, R, A extends unknown[]> = {
	enabled: boolean;
	getDeadline?(currentState: State<T, E, R, A>): number;
	hash?(
		args: A | undefined,
		payload: Record<string, unknown> | null | undefined
	): string;

	persist?(cache: Record<string, CachedState<T, E, R, A>>): void;
	load?():
		| Record<string, CachedState<T, E, R, A>>
		| Promise<Record<string, CachedState<T, E, R, A>>>;

	onCacheLoad?({ cache, setState }: OnCacheLoadProps<T, E, R, A>): void;
};
export type CachedState<T, E, R, A extends unknown[]> = {
	state: State<T, E, R, A>;
	addedAt: number;
	deadline: number;
};

export interface StateBuilderInterface {
	initial: <T, A extends unknown[]>(initialValue: T) => InitialState<T, A>;
	pending: <T, A extends unknown[]>(
		props: ProducerSavedProps<T, A>
	) => PendingState<T, A>;
	success: <T, A extends unknown[]>(
		data: T,
		props: ProducerSavedProps<T, A> | null
	) => SuccessState<T, A>;
	error: <T, E, A extends unknown[]>(
		data: E,
		props: ProducerSavedProps<T, A>
	) => ErrorState<T, E, A>;
	aborted: <T, E, R, A extends unknown[]>(
		reason: R | undefined,
		props: ProducerSavedProps<T, A>
	) => AbortedState<T, E, R, A>;
}

export type ForkConfig = {
	key?: string;
	keepState?: boolean;
	keepCache?: boolean;
};
export type AsyncStateKeyOrSource<T, E, R, A extends unknown[]> =
	| string
	| Source<T, E, R, A>;

export type EffectsRunType<T, E, R, A extends unknown[]> = (
	input: ProducerRunInput<T, E, R, A>,
	config: ProducerRunConfig | null,
	...args: A
) => AbortFn<R>;

export type EffectsRunpType<T, E, R, A extends unknown[]> = (
	input: ProducerRunInput<T, E, R, A>,
	config: ProducerRunConfig | null,
	...args: A
) => Promise<State<T, E, R, A>> | undefined;
export type EffectsSelectType<T, E, R, A extends unknown[]> = (
	input: AsyncStateKeyOrSource<T, E, R, A>,
	lane?: string
) => State<T, E, R, A> | undefined;
export interface ProducerEffects {}

export type ProducerRunInput<T, E, R, A extends unknown[]> =
	| AsyncStateKeyOrSource<T, E, R, A>
	| Producer<T, E, R, A>;
export type ProducerRunConfig = {
	lane?: string;
	fork?: boolean;
	payload?: Record<string, unknown> | null;
	pool?: string;
};
export type PendingTimeout = {
	id: ReturnType<typeof setTimeout>;
	at: number;
};
export type PendingUpdate = {
	id: ReturnType<typeof setTimeout>;
	callback(): void;
};
export type AsyncStatePools = Record<string, PoolInterface>;
export type WatchCallback<T, E, R, A extends unknown[]> = (
	value: StateInterface<T, E, R, A> | null,
	key: string
) => void;

export interface PoolInterface {
	name: string;
	simpleName: string;
	version: { version: string; copyright: string };

	mergePayload(payload: Record<string, unknown>): void;

	instances: Map<string, StateInterface<any, any, any, any>>;

	watch<T, E, R, A extends unknown[]>(
		key: string,
		value: WatchCallback<T, E, R, A>
	): AbortFn<R>;

	listen<T, E, R, A extends unknown[]>(
		cb: WatchCallback<T, E, R, A>
	): AbortFn<R>;

	set<T, E, R, A extends unknown[]>(
		key: string,
		instance: StateInterface<T, E, R, A>
	): void;

	context: LibraryPoolsContext;
}

export type LibraryPoolsContext = {
	context: unknown;
	pools: AsyncStatePools;
	poolInUse: PoolInterface;
	enableDiscovery(name?: string): void;
	setDefaultPool(name: string): Promise<void>;
	getOrCreatePool(name?: string): PoolInterface;
};

export type SetStateUpdateQueue<T, E, R, A extends unknown[]> = {
	id?: ReturnType<typeof setTimeout>;
	kind: 0;
	data: State<T, E, R, A>;
	next: UpdateQueue<T, E, R, A> | null;
	callbacks?: ProducerCallbacks<T, E, R, A>;
};

export type ReplaceStateUpdateQueue<T, E, R, A extends unknown[]> = {
	id?: ReturnType<typeof setTimeout>;
	kind: 1;
	data: {
		status?: Status;
		data: T | StateFunctionUpdater<T, E, R, A>;
	};
	next: UpdateQueue<T, E, R, A> | null;
	callbacks?: ProducerCallbacks<T, E, R, A>;
};

export type UpdateQueue<T, E, R, A extends unknown[]> =
	| ReplaceStateUpdateQueue<T, E, R, A>
	| SetStateUpdateQueue<T, E, R, A>;

export type OnSettled<T, E, R, A extends unknown[]> = {
	(
		data: T,
		status: Status.success,
		savedProps: ProducerSavedProps<T, A>,
		callbacks?: ProducerCallbacks<T, E, R, A>
	): void;
	(
		data: E,
		status: Status.error,
		savedProps: ProducerSavedProps<T, A>,
		callbacks?: ProducerCallbacks<T, E, R, A>
	): void;
};
export type CreatePropsConfig<T, E, R, A extends unknown[]> = {
	args: A;
	context: LibraryPoolsContext;
	payload: Record<string, unknown>;
	indicators: RunIndicators;
	lastSuccess: LastSuccessSavedState<T, A>;
	getState: () => State<T, E, R, A>;
	onEmit: (
		updater: T | StateFunctionUpdater<T, E, R, A>,
		status?: Status
	) => void;
	onAborted: (reason?: R) => void;
	onCleared: () => void;
};
