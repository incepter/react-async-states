export type AbortFn = () => void;

export type Fn<T, A extends unknown[], R, P> = {
	(props: FnProps<T, A, R, P>): T | Promise<T>;
};

export type RunEffect = "delay" | "debounce" | "throttle";

export type CacheConfig<T, A extends unknown[], R, P> = {
	enabled?: boolean;
	hash?(args: A, payload: P): string;
	deadline?: CacheEntryDeadline<T, A, R, P>; // in Ms

	load?(): CachedStateList<T, A, P>;
	persist?(cache: CachedStateList<T, A, P>): void;
};

export type RetryConfig<T, A extends unknown[], R, P> = {
	enabled?: boolean;
	max?: number;
	backoff?: number;
	retry(e: R, retryCounter: number): boolean;
};

export type CachedStateList<T, A extends unknown[], P> = {
	[hash: string]: CachedState<T, A, P>;
};

export type CachedState<T, A extends unknown[], P> = {
	args: A;
	payload: P;
	data: T;
	timestamp: number;
	deadline: number;
};

export type CacheEntryDeadline<T, A extends unknown[], R, P> =
	| number
	| ((state: SuccessState<T, A, P>) => number);

export interface BaseFiberConfig<T, A extends unknown[], R, P> {
	initialValue?: T;

	effect?: RunEffect;
	effectDurationMs?: number;

	keepPendingForMs?: number;
	skipPendingDelayMs?: number;

	reset?: boolean;

	retryConfig?: RetryConfig<T, A, R, P>;
	cacheConfig?: CacheConfig<T, A, R, P>;
}

export interface FnProps<T, A extends unknown[], R, P> {
	args: A;
	payload: P;

	abort(): void;
	signal: AbortSignal;
	isAborted(): boolean;
	onAbort(cb: () => void): void;

	// emit
	// run
	// select
}

export interface StateRoot<T, A extends unknown[], R, P> {
	key: string;

	fn?: Fn<T, A, R, P>;
	config?: BaseFiberConfig<T, A, R, P>;
}

export interface IStateFiberRoot<T, A extends unknown[], R, P> {
	root: StateRoot<T, A, R, P>;
	bind(ctx: any): IStateFiber<T, A, R, P>;
}

export interface IStateFiber<T, A extends unknown[], R, P>
	extends IStateFiberRoot<T, A, R, P> {
	id: number;
	version: number;

	payload: P;
	state: State<T, A, R, P>; // the current state

	context: ILibraryContext;
	listeners: Map<Function, any>; // actual retainers
	actions: IStateFiberActions<T, A, R, P>; // wrapper to manipulate this fiber

	task: RunTask<T, A, R, P> | null; // the latest executed task that completed
	pending: RunTask<T, A, R, P> | null; // the current pending task
}

export interface ILibraryContext {
	get(key: string): IStateFiber<any, any, any, any> | undefined;
	set(key: string, instance: IStateFiber<any, any, any, any>): void;
	remove(key: string);
}

export type StateFiberUpdate<T> = T | ((prev: T) => T);

export interface IStateFiberActions<T, A extends unknown[], R, P> {
	run(...args: A): () => void;
	runp(...args: A): Promise<any>;
	runc(props: RuncProps<T, A, R, P>): () => void;

	setError(error: R): void;
	setState(state: State<T, A, R, P>): void;
	setData(update: StateFiberUpdate<T>): void;

	getState(): State<T, A, R, P>;

	getPayload(): P;
	mergePayload(p: Partial<P>): void;

	dispose(): void;
	subscribe(cb: Function, data: any): () => void;
}

export interface RuncProps<T, A extends unknown[], R, P> {
	args?: A;
	payload?: P;
	onError?(e: R): void;
	onSuccess?(s: T): void;
}

export type FiberPromise<T, R> =
	| PendingPromise<T>
	| FulfilledPromise<T>
	| RejectedPromise<R>;

export interface PendingPromise<T> extends Promise<T> {
	status: "pending";
}
export interface FulfilledPromise<T> extends Promise<T> {
	value: T;
	status: "fulfilled";
}
export interface RejectedPromise<R> extends Promise<any> {
	reason: R;
	status: "rejected";
}

export interface RunTask<T, A extends unknown[], R, P> {
	args: A;
	payload: P;

	controller: AbortController;
	result: T | Promise<T> | null;
	promise: FiberPromise<T, R> | null;

	clean: () => void;
	onAbort(cb): void;
	indicators: {
		aborted: boolean;
		cleared: boolean;
	};
	callbacks: ICallbacks<T, R> | null;
}

export interface ICallbacks<T, R> {
	onError?(e: R): void;
	onSuccess?(s: T): void;
}

export type InitialState<T> = {
	data?: T;
	timestamp: number;
	status: "initial";
};

export type PendingState<T, A extends unknown[], R, P> = {
	timestamp: number;
	status: "pending";
	props: SavedProps<A, P>;
	prev: InitialState<T> | ErrorState<A, R, P> | SuccessState<T, A, P>;
};

export type ErrorState<A extends unknown[], R, P> = {
	error: R;
	status: "error";
	timestamp: number;
	props: SavedProps<A, P>;
};

export type SuccessState<T, A extends unknown[], P> = {
	data: T;
	timestamp: number;
	status: "success";
	props: SavedProps<A, P>;
};

export type SavedProps<A extends unknown[], P> = {
	args: A;
	payload: P;
};

export type State<T, A extends unknown[], R, P> =
	| InitialState<T>
	| ErrorState<A, R, P>
	| SuccessState<T, A, P>;
