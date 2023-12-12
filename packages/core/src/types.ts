import { RunEffect, Status } from "./enums";

export type ProducerWrapperInput<T, A extends unknown[], E> = {
	setState: StateUpdater<T, A, E>;
	instance?: StateInterface<T, A, E>;
	setSuspender(p: Promise<T>): void;
	replaceState(
		newState: State<T, A, E>,
		notify?: boolean,
		callbacks?: ProducerCallbacks<T, A, E>
	): void;
	getProducer(): Producer<T, A, E> | undefined | null;
};

export interface BaseSource<T, A extends unknown[], E> {
	// identity
	key: string;
	uniqueId: number;
	readonly inst: StateInterface<T, A, E>;

	getVersion(): number;

	getPayload(): Record<string, unknown>;

	mergePayload(partialPayload?: Record<string, unknown>): void;

	// state
	getState(): State<T, A, E>;

	// todo: overload this!!!!
	setState(
		updater: StateFunctionUpdater<T, A, E> | T,
		status?: Status,
		callbacks?: ProducerCallbacks<T, A, E>
	): void;

	replaceState(
		newState: State<T, A, E>,
		notify?: boolean,
		callbacks?: ProducerCallbacks<T, A, E>
	): void;

	// subscriptions
	subscribe(cb: (s: State<T, A, E>) => void): AbortFn;

	subscribe(subProps: AsyncStateSubscribeProps<T, A, E>): AbortFn;

	subscribe(
		argv: ((s: State<T, A, E>) => void) | AsyncStateSubscribeProps<T, A, E>
	): AbortFn;

	// producer
	replay(): AbortFn;

	abort(reason?: any): void;

	replaceProducer(newProducer: Producer<T, A, E> | null): void;

	// cache
	invalidateCache(cacheKey?: string): void;

	replaceCache(cacheKey: string, cache: CachedState<T, A, E>): void;

	patchConfig(partialConfig?: Partial<ProducerConfig<T, A, E>>): void;

	getConfig(): ProducerConfig<T, A, E>;

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

	dispose(): boolean;
}

export type InstanceEventHandlerType<T, A extends unknown[], E> =
	| InstanceChangeEventHandlerType<T, A, E>
	| InstanceDisposeEventHandlerType<T, A, E>
	| InstanceCacheChangeEventHandlerType<T, A, E>;
export type StateChangeEventHandler<T, A extends unknown[], E> =
	| ((newState: State<T, A, E>) => void)
	| InstanceChangeEventObject<T, A, E>;
export type InstanceChangeEventObject<T, A extends unknown[], E> = {
	status: Status;
	handler: (newState: State<T, A, E>) => void;
};
export type InstanceChangeEventHandlerType<T, A extends unknown[], E> =
	| StateChangeEventHandler<T, A, E>
	| StateChangeEventHandler<T, A, E>[];
export type InstanceDisposeEventHandlerType<T, A extends unknown[], E> =
	| (() => void)
	| (() => void)[];
export type InstanceCacheChangeEventHandlerType<T, A extends unknown[], E> =
	| ((cache: Record<string, CachedState<T, A, E>> | null | undefined) => void)
	| ((
			cache: Record<string, CachedState<T, A, E>> | null | undefined
	  ) => void)[];
export type InstanceChangeEvent = "change";
export type InstanceDisposeEvent = "dispose";
export type InstanceCacheChangeEvent = "cache-change";
export type InstanceEventType =
	| InstanceChangeEvent
	| InstanceDisposeEvent
	| InstanceCacheChangeEvent;
export type AsyncStateSubscribeProps<T, A extends unknown[], E> = {
	key?: string;
	flags?: number;
	cb(s: State<T, A, E>): void;
};
export type InstanceEvents<T, A extends unknown[], E> = {
	change?: Record<number, InstanceChangeEventHandlerType<T, A, E>>;
	dispose?: Record<number, InstanceDisposeEventHandlerType<T, A, E>>;
	["cache-change"]?: Record<
		number,
		InstanceCacheChangeEventHandlerType<T, A, E>
	>;
};

export type HydrationData<T, A extends unknown[], E> = {
	state: State<T, A, E>;
	payload: Record<string, unknown>;
	latestRun: RunTask<T, A, E> | null;
};

export interface StateInterface<T, A extends unknown[], E> {
	// identity
	key: string;
	version: number;
	id: number;
	actions: Source<T, A, E>;
	config: ProducerConfig<T, A, E>;
	payload: Record<string, any> | null;

	// state
	state: State<T, A, E>;
	lastSuccess: LastSuccessSavedState<T, A>;

	pendingUpdate: PendingUpdate | null;
	pendingTimeout: PendingTimeout | null;

	queue: UpdateQueue<T, A, E> | null;

	// subscriptions
	subsIndex: number | null;
	subscriptions: Record<number, StateSubscription<T, A, E>> | null;

	// producer
	promise: Promise<T> | null;
	fn: Producer<T, A, E> | null;
	readonly ctx: LibraryContext | null;

	latestRun: RunTask<T, A, E> | null;
	currentAbort: AbortFn | null;

	// lanes and forks
	parent: StateInterface<T, A, E> | null;
	lanes: Record<string, StateInterface<T, A, E>> | null;

	// cache
	cache: Record<string, CachedState<T, A, E>> | null;

	events: InstanceEvents<T, A, E> | null;
	eventsIndex: number | null;
	// dev properties
	journal?: any[]; // for devtools, dev only
}

export interface RUNCProps<T, A extends unknown[], E>
	extends ProducerCallbacks<T, A, E> {
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
	status: "success";
	props: ProducerSavedProps<T, A>;
};
export type ErrorState<T, A extends unknown[], E> = {
	data: E;
	timestamp: number;
	status: "error";
	props: ProducerSavedProps<T, A>;
};
export type PendingState<T, A extends unknown[], E> = {
	data: null;
	timestamp: number;
	status: "pending";
	props: ProducerSavedProps<T, A>;

	prev: PendingPreviousState<T, A, E>;
};

export type PendingPreviousState<T, A extends unknown[], E> =
	| InitialState<T, A>
	| SuccessState<T, A>
	| ErrorState<T, A, E>;

export type InitialState<T, A extends unknown[]> = {
	timestamp: number;
	data: T | undefined;
	status: "initial";
	props: ProducerSavedProps<T, A> | null;
};

export type State<T, A extends unknown[], E> =
	| InitialState<T, A>
	| PendingState<T, A, E>
	| SuccessState<T, A>
	| ErrorState<T, A, E>;
export type AbortFn = ((reason?: any) => void) | undefined;
export type OnAbortFn<R = unknown> = (cb?: (reason?: R) => void) => void;

export interface ProducerProps<T, A extends unknown[] = [], E = Error>
	extends ProducerEffects {
	abort: AbortFn;
	onAbort: OnAbortFn;
	emit: StateUpdater<T, A, E>;

	args: A;
	payload: Record<string, unknown>;
	lastSuccess: LastSuccessSavedState<T, A>;
	isAborted: () => boolean;

	getState: () => State<T, A, E>;

	signal: AbortSignal;
}

export type RunIndicators = {
	index: number;
	done: boolean;
	cleared: boolean;
	aborted: boolean;
};

export type ProducerCallbacks<T, A extends unknown[], E> = {
	onError?(errorState: ErrorState<T, A, E>): void;
	onSuccess?(successState: SuccessState<T, A>): void;
};

export type ProducerSavedProps<T, A extends unknown[]> = {
	args?: A;
	payload?: Record<string, unknown> | null;
};

export type Producer<T, A extends unknown[] = [], E = Error> = (
	props: ProducerProps<T, A, E>
) => T | Promise<T> | Generator<any, T, any>;

export type ProducerFunction<T, A extends unknown[], E> = (
	props: ProducerProps<T, A, E>,
	runIndicators: RunIndicators,
	callbacks?: ProducerCallbacks<T, A, E>
) => AbortFn;
export type ProducerConfig<T, A extends unknown[], E> = {
	skipPendingStatus?: boolean;
	initialValue?:
		| T
		| ((cache: Record<string, CachedState<T, A, E>> | null) => T);
	cacheConfig?: CacheConfig<T, A, E>;
	runEffectDurationMs?: number;
	runEffect?: RunEffect;
	keepPendingForMs?: number;
	skipPendingDelayMs?: number;
	resetStateOnDispose?: boolean;
	context?: unknown;

	// dev only
	hideFromDevtools?: boolean;
	retryConfig?: RetryConfig<T, A, E>;
	storeInContext?: boolean;
};

export type RetryConfig<T, A extends unknown[], E> = {
	enabled: boolean;
	maxAttempts?: number;
	backoff?: number | ((attemptIndex: number, error: E) => number);
	retry?: boolean | ((attemptIndex: number, error: E) => boolean);
};

export type StateFunctionUpdater<T, A extends unknown[], E> = (
	updater: State<T, A, E>
) => T;
export type StateUpdater<T, A extends unknown[], E> = (
	updater: StateFunctionUpdater<T, A, E> | T,
	status?: Status,
	callbacks?: ProducerCallbacks<T, A, E>
) => void;

export type CreateSourceObject<T, A extends unknown[], E> = {
	key: string;
	config?: ProducerConfig<T, A, E>;
	producer?: Producer<T, A, E> | null;
};

export interface Source<T, A extends unknown[], E> extends BaseSource<T, A, E> {
	run(...args: A): AbortFn;

	runp(...args: A): Promise<State<T, A, E>>;

	runc(props: RUNCProps<T, A, E>): AbortFn;

	hasLane(laneKey: string): boolean;

	removeLane(laneKey?: string): boolean;

	getLane(laneKey?: string): Source<T, A, E>;

	getAllLanes(): Source<T, A, E>[];
}

export type RunTask<T, A extends unknown[], E> = {
	args: A;
	payload: Record<string, unknown>;
};
export type StateSubscription<T, A extends unknown[], E> = {
	cleanup: () => void;
	props: AsyncStateSubscribeProps<T, A, E>;
};
export type OnCacheLoadProps<T, A extends unknown[], E> = {
	cache: Record<string, CachedState<T, A, E>>;
	setState(newValue: T | StateFunctionUpdater<T, A, E>, status?: Status): void;
};
export type CacheConfig<T, A extends unknown[], E> = {
	enabled: boolean;
	timeout?: ((currentState: State<T, A, E>) => number) | number;
	hash?(
		args: A | undefined,
		payload: Record<string, unknown> | null | undefined
	): string;
	auto?: boolean;

	persist?(cache: Record<string, CachedState<T, A, E>>): void;
	load?():
		| Record<string, CachedState<T, A, E>>
		| Promise<Record<string, CachedState<T, A, E>>>;

	onCacheLoad?({ cache, setState }: OnCacheLoadProps<T, A, E>): void;
};
export type CachedState<T, A extends unknown[], E> = {
	state: State<T, A, E>;
	addedAt: number;
	deadline: number;

	// when auto refresh is enabled, we store it in this id
	id?: ReturnType<typeof setTimeout>;
};

export type AsyncStateKeyOrSource<T, A extends unknown[], E> =
	| string
	| Source<T, A, E>;

export interface ProducerEffects {}

export type ProducerRunInput<T, A extends unknown[], E> =
	| AsyncStateKeyOrSource<T, A, E>
	| Producer<T, A, E>;
export type ProducerRunConfig = {
	lane?: string;
	fork?: boolean;
	payload?: Record<string, unknown> | null;
};
export type PendingTimeout = {
	id: ReturnType<typeof setTimeout>;
	at: number;
};
export type PendingUpdate = {
	id: ReturnType<typeof setTimeout>;
	callback(): void;
};

export type SetStateUpdateQueue<T, A extends unknown[], E> = {
	id?: ReturnType<typeof setTimeout>;
	kind: 0;
	data: State<T, A, E>;
	next: UpdateQueue<T, A, E> | null;
	callbacks?: ProducerCallbacks<T, A, E>;
};

export type ReplaceStateUpdateQueue<T, A extends unknown[], E> = {
	id?: ReturnType<typeof setTimeout>;
	kind: 1;
	data: {
		status?: Status;
		data: T | StateFunctionUpdater<T, A, E>;
	};
	next: UpdateQueue<T, A, E> | null;
	callbacks?: ProducerCallbacks<T, A, E>;
};

export type UpdateQueue<T, A extends unknown[], E> =
	| ReplaceStateUpdateQueue<T, A, E>
	| SetStateUpdateQueue<T, A, E>;

export type OnSettled<T, A extends unknown[], E> = {
	(
		data: T,
		status: "success",
		savedProps: ProducerSavedProps<T, A>,
		callbacks?: ProducerCallbacks<T, A, E>
	): void;
	(
		data: E,
		status: "error",
		savedProps: ProducerSavedProps<T, A>,
		callbacks?: ProducerCallbacks<T, A, E>
	): void;
};

export type LibraryContext = {
	ctx: any;
	version: { version: string; copyright: string };

	remove(key: string): boolean;
	get(key: string): StateInterface<any, any, any> | undefined;
	set(key: string, inst: StateInterface<any, any, any>): void;

	getAll(): StateInterface<any, any, any>[];
	terminate(): void;
};
