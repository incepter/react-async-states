export type AbortFn = () => void;

export type Fn<T, A extends unknown[], R, P> = {
	(props: FnProps<T, A, R, P>): AbortFn;
};

export interface BaseFiberConfig<T, A extends unknown[], R, P> {
	initialValue?: T;
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
	listeners: StateFiberListeners; // actual retainers
	actions: IStateFiberActions<T, A, R, P>; // wrapper to manipulate this fiber

	task: RunTask<T, A, R, P> | null; // the latest executed task
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
}

export interface RuncProps<T, A extends unknown[], R, P> {
	args?: A;
	payload?: P;
	onError?(e: R): void;
	onSuccess?(s: T): void;
}

export interface StateFiberListeners {}

export interface RunTask<T, A extends unknown[], R, P> {
	args: A;
	payload: P;

	promise: Promise<T> | null;
	controller: AbortController;
	result: T | Promise<T> | null;

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
	prev: State<T, A, R, P>;
	props: SavedProps<A, P>;
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
	| PendingState<T, A, R, P>
	| ErrorState<A, R, P>
	| SuccessState<T, A, P>;
