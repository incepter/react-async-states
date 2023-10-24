import { RunEffect, Status } from "./enums";

export type ProducerWrapperInput<T, E, A extends unknown[]> = {
	setState: StateUpdater<T, E, A>;
	instance?: StateInterface<T, E, A>;
	setSuspender(p: Promise<T>): void;
	replaceState(
		newState: State<T, E, A>,
		notify?: boolean,
		callbacks?: ProducerCallbacks<T, E, A>
	): void;
	getProducer(): Producer<T, E, A> | undefined | null;
};

export interface BaseSource<T, E, A extends unknown[]> {
	// identity
	key: string;
	uniqueId: number;
	readonly inst: StateInterface<T, E, A>;

	getVersion(): number;

	getPayload(): Record<string, unknown>;

	mergePayload(partialPayload?: Record<string, unknown>): void;

	// state
	getState(): State<T, E, A>;

	// todo: overload this!!!!
	setState(
		updater: StateFunctionUpdater<T, E, A> | T,
		status?: Status,
		callbacks?: ProducerCallbacks<T, E, A>
	): void;

	replaceState(
		newState: State<T, E, A>,
		notify?: boolean,
		callbacks?: ProducerCallbacks<T, E, A>
	): void;

	// subscriptions
	subscribe(cb: (s: State<T, E, A>) => void): AbortFn;

	subscribe(subProps: AsyncStateSubscribeProps<T, E, A>): AbortFn;

	subscribe(
		argv: ((s: State<T, E, A>) => void) | AsyncStateSubscribeProps<T, E, A>
	): AbortFn;

	// producer
	replay(): AbortFn;

	abort(reason?: any): void;

	replaceProducer(newProducer: Producer<T, E, A> | null): void;

	// cache
	invalidateCache(cacheKey?: string): void;

	replaceCache(cacheKey: string, cache: CachedState<T, E, A>): void;

	patchConfig(partialConfig?: Partial<ProducerConfig<T, E, A>>): void;

	getConfig(): ProducerConfig<T, E, A>;

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

	dispose(): boolean;
}

export type InstanceEventHandlerType<T, E, A extends unknown[]> =
	| InstanceChangeEventHandlerType<T, E, A>
	| InstanceDisposeEventHandlerType<T, E, A>
	| InstanceCacheChangeEventHandlerType<T, E, A>;
export type StateChangeEventHandler<T, E, A extends unknown[]> =
	| ((newState: State<T, E, A>) => void)
	| InstanceChangeEventObject<T, E, A>;
export type InstanceChangeEventObject<T, E, A extends unknown[]> = {
	status: Status;
	handler: (newState: State<T, E, A>) => void;
};
export type InstanceChangeEventHandlerType<T, E, A extends unknown[]> =
	| StateChangeEventHandler<T, E, A>
	| StateChangeEventHandler<T, E, A>[];
export type InstanceDisposeEventHandlerType<T, E, A extends unknown[]> =
	| (() => void)
	| (() => void)[];
export type InstanceCacheChangeEventHandlerType<T, E, A extends unknown[]> =
	| ((cache: Record<string, CachedState<T, E, A>> | null | undefined) => void)
	| ((
			cache: Record<string, CachedState<T, E, A>> | null | undefined
	  ) => void)[];
export type InstanceChangeEvent = "change";
export type InstanceDisposeEvent = "dispose";
export type InstanceCacheChangeEvent = "cache-change";
export type InstanceEventType =
	| InstanceChangeEvent
	| InstanceDisposeEvent
	| InstanceCacheChangeEvent;
export type AsyncStateSubscribeProps<T, E, A extends unknown[]> = {
	key?: string;
	flags?: number;
	cb(s: State<T, E, A>): void;
};
export type InstanceEvents<T, E, A extends unknown[]> = {
	change?: Record<number, InstanceChangeEventHandlerType<T, E, A>>;
	dispose?: Record<number, InstanceDisposeEventHandlerType<T, E, A>>;
	["cache-change"]?: Record<
		number,
		InstanceCacheChangeEventHandlerType<T, E, A>
	>;
};

export type HydrationData<T, E, A extends unknown[]> = {
	state: State<T, E, A>;
	payload: Record<string, unknown>;
	latestRun: RunTask<T, E, A> | null;
};

export interface StateInterface<T, E, A extends unknown[]> {
	// identity
	key: string;
	version: number;
	uniqueId: number;
	actions: Source<T, E, A>;
	config: ProducerConfig<T, E, A>;
	payload: Record<string, any> | null;

	// state
	state: State<T, E, A>;
	lastSuccess: LastSuccessSavedState<T, A>;

	pendingUpdate: PendingUpdate | null;
	pendingTimeout: PendingTimeout | null;

	queue: UpdateQueue<T, E, A> | null;

	// subscriptions
	subsIndex: number | null;
	subscriptions: Record<number, StateSubscription<T, E, A>> | null;

	// producer
	promise: Promise<T> | null;
	fn: Producer<T, E, A> | null;
	readonly ctx: LibraryContext;

	latestRun: RunTask<T, E, A> | null;
	currentAbort: AbortFn | null;

	// lanes and forks
	parent: StateInterface<T, E, A> | null;
	lanes: Record<string, StateInterface<T, E, A>> | null;

	// cache
	cache: Record<string, CachedState<T, E, A>> | null;

	events: InstanceEvents<T, E, A> | null;
	eventsIndex: number | null;
	// dev properties
	journal?: any[]; // for devtools, dev only
}

export interface RUNCProps<T, E, A extends unknown[]>
	extends ProducerCallbacks<T, E, A> {
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
export type PendingState<T, E, A extends unknown[]> = {
	data: null;
	timestamp: number;
	status: Status.pending;
	props: ProducerSavedProps<T, A>;

	prev: PendingPreviousState<T, E, A>;
};

export type PendingPreviousState<T, E, A extends unknown[]> =
	| InitialState<T, A>
	| SuccessState<T, A>
	| ErrorState<T, E, A>;

export type InitialState<T, A extends unknown[]> = {
	timestamp: number;
	data: T | undefined;
	status: Status.initial;
	props: ProducerSavedProps<T, A> | null;
};

export type State<T, E, A extends unknown[]> =
	| InitialState<T, A>
	| PendingState<T, E, A>
	| SuccessState<T, A>
	| ErrorState<T, E, A>;
export type AbortFn = ((reason?: any) => void) | undefined;
export type OnAbortFn<R = unknown> = (cb?: (reason?: R) => void) => void;

export interface ProducerProps<T, E, A extends unknown[]>
	extends ProducerEffects {
	abort: AbortFn;
	onAbort: OnAbortFn;
	emit: StateUpdater<T, E, A>;

	args: A;
	payload: Record<string, unknown>;
	lastSuccess: LastSuccessSavedState<T, A>;
	isAborted: () => boolean;

	getState: () => State<T, E, A>;

	signal: AbortSignal;
}

export type RunIndicators = {
	index: number;
	done: boolean;
	cleared: boolean;
	aborted: boolean;
};
export type ProducerCallbacks<T, E, A extends unknown[]> = {
	onError?(errorState: ErrorState<T, E, A>): void;
	onSuccess?(successState: SuccessState<T, A>): void;
};
export type ProducerSavedProps<T, A extends unknown[]> = {
	args?: A;
	payload?: Record<string, unknown> | null;
};
export type Producer<T, E, A extends unknown[]> = (
	props: ProducerProps<T, E, A>
) => T | Promise<T> | Generator<any, T, any>;
export type ProducerFunction<T, E, A extends unknown[]> = (
	props: ProducerProps<T, E, A>,
	runIndicators: RunIndicators,
	callbacks?: ProducerCallbacks<T, E, A>
) => AbortFn;
export type ProducerConfig<T, E, A extends unknown[]> = {
	skipPendingStatus?: boolean;
	initialValue?:
		| T
		| ((cache: Record<string, CachedState<T, E, A>> | null) => T);
	cacheConfig?: CacheConfig<T, E, A>;
	runEffectDurationMs?: number;
	runEffect?: RunEffect;
	keepPendingForMs?: number;
	skipPendingDelayMs?: number;
	resetStateOnDispose?: boolean;
	context?: unknown;

	// dev only
	hideFromDevtools?: boolean;
	retryConfig?: RetryConfig<T, E, A>;
};

export type RetryConfig<T, E, A extends unknown[]> = {
	enabled: boolean;
	maxAttempts?: number;
	backoff?: number | ((attemptIndex: number, error: E) => number);
	retry?: boolean | ((attemptIndex: number, error: E) => boolean);
};

export type StateFunctionUpdater<T, E, A extends unknown[]> = (
	updater: State<T, E, A>
) => T;
export type StateUpdater<T, E, A extends unknown[]> = (
	updater: StateFunctionUpdater<T, E, A> | T,
	status?: Status,
	callbacks?: ProducerCallbacks<T, E, A>
) => void;

export type CreateSourceObject<T, E, A extends unknown[]> = {
	key: string;
	config?: ProducerConfig<T, E, A>;
	producer?: Producer<T, E, A> | null;
};

export interface Source<T, E, A extends unknown[]> extends BaseSource<T, E, A> {
	run(...args: A): AbortFn;

	runp(...args: A): Promise<State<T, E, A>>;

	runc(props: RUNCProps<T, E, A>): AbortFn;

	hasLane(laneKey: string): boolean;

	removeLane(laneKey?: string): boolean;

	getLane(laneKey?: string): Source<T, E, A>;

	getAllLanes(): Source<T, E, A>[];
}

export type RunTask<T, E, A extends unknown[]> = {
	args: A;
	payload: Record<string, unknown>;
};
export type StateSubscription<T, E, A extends unknown[]> = {
	cleanup: () => void;
	props: AsyncStateSubscribeProps<T, E, A>;
};
export type OnCacheLoadProps<T, E, A extends unknown[]> = {
	cache: Record<string, CachedState<T, E, A>>;
	setState(newValue: T | StateFunctionUpdater<T, E, A>, status?: Status): void;
};
export type CacheConfig<T, E, A extends unknown[]> = {
	enabled: boolean;
	getDeadline?(currentState: State<T, E, A>): number;
	hash?(
		args: A | undefined,
		payload: Record<string, unknown> | null | undefined
	): string;

	persist?(cache: Record<string, CachedState<T, E, A>>): void;
	load?():
		| Record<string, CachedState<T, E, A>>
		| Promise<Record<string, CachedState<T, E, A>>>;

	onCacheLoad?({ cache, setState }: OnCacheLoadProps<T, E, A>): void;
};
export type CachedState<T, E, A extends unknown[]> = {
	state: State<T, E, A>;
	addedAt: number;
	deadline: number;
};

export interface StateBuilderInterface {
	initial: <T, A extends unknown[]>(initialValue: T) => InitialState<T, A>;
	pending: <T, E, A extends unknown[]>(
		prev: PendingPreviousState<T, E, A>,
		props: ProducerSavedProps<T, A>
	) => PendingState<T, E, A>;
	success: <T, A extends unknown[]>(
		data: T,
		props: ProducerSavedProps<T, A> | null
	) => SuccessState<T, A>;
	error: <T, E, A extends unknown[]>(
		data: E,
		props: ProducerSavedProps<T, A>
	) => ErrorState<T, E, A>;
}

export type AsyncStateKeyOrSource<T, E, A extends unknown[]> =
	| string
	| Source<T, E, A>;

export interface ProducerEffects {}

export type ProducerRunInput<T, E, A extends unknown[]> =
	| AsyncStateKeyOrSource<T, E, A>
	| Producer<T, E, A>;
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

export type SetStateUpdateQueue<T, E, A extends unknown[]> = {
	id?: ReturnType<typeof setTimeout>;
	kind: 0;
	data: State<T, E, A>;
	next: UpdateQueue<T, E, A> | null;
	callbacks?: ProducerCallbacks<T, E, A>;
};

export type ReplaceStateUpdateQueue<T, E, A extends unknown[]> = {
	id?: ReturnType<typeof setTimeout>;
	kind: 1;
	data: {
		status?: Status;
		data: T | StateFunctionUpdater<T, E, A>;
	};
	next: UpdateQueue<T, E, A> | null;
	callbacks?: ProducerCallbacks<T, E, A>;
};

export type UpdateQueue<T, E, A extends unknown[]> =
	| ReplaceStateUpdateQueue<T, E, A>
	| SetStateUpdateQueue<T, E, A>;

export type OnSettled<T, E, A extends unknown[]> = {
	(
		data: T,
		status: Status.success,
		savedProps: ProducerSavedProps<T, A>,
		callbacks?: ProducerCallbacks<T, E, A>
	): void;
	(
		data: E,
		status: Status.error,
		savedProps: ProducerSavedProps<T, A>,
		callbacks?: ProducerCallbacks<T, E, A>
	): void;
};

export type LibraryContext = {
	ctx: any;
	version: { version: string; copyright: string };

	remove(key: string): boolean;
	get(key: string): StateInterface<any, any, any> | undefined;
	set(key: string, inst: StateInterface<any, any, any>): void;

	getAll(): StateInterface<any, any, any>[];
};
