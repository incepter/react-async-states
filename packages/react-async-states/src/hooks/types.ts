import {
	AbortFn,
	CacheConfig,
	CachedState,
	LastSuccessSavedState,
	PendingState,
	Producer,
	ProducerConfig,
	RunEffect,
	Source,
	State,
	StateInterface,
	Status,
} from "async-states";

export interface BaseUseAsyncState<
	T,
	E,
	A extends unknown[],
	S = State<T, E, A>
> {
	source: Source<T, E, A>;

	onChange(
		events:
			| ((prevEvents?: HookChangeEvents<T, E, A>) => void)
			| HookChangeEvents<T, E, A>
	): void;

	onSubscribe(
		events:
			| ((prevEvents?: UseAsyncStateEventSubscribe<T, E, A>) => void)
			| UseAsyncStateEventSubscribe<T, E, A>
	): void;
}

export type UseAsyncState<
	T,
	E = unknown,
	A extends unknown[] = unknown[],
	S = State<T, E, A>
> = LegacyHookReturn<T, E, A, S>;
export type EqualityFn<T> = (prev: T, next: T) => boolean;

export interface BaseConfig<T, E, A extends unknown[]>
	extends ProducerConfig<T, E, A> {
	key?: string;
	lane?: string;

	/**
	 * @deprecated useAsyncState 'concurrent' option is deprecated. it will have
	 * a new
	 */
	concurrent?: boolean;
	source?: Source<T, E, A>;
	autoRunArgs?: A;
	producer?: Producer<T, E, A>;
	subscriptionKey?: string;
	payload?: Record<string, unknown>;
	events?: UseAsyncStateEvents<T, E, A>;

	/**
	 * @deprecated useAsyncState 'wait' option is deprecated. It was never used
	 * in practice. And can be simulated easily.
	 */
	wait?: boolean;
	lazy?: boolean;
	condition?:
		| boolean
		| ((
				state: State<T, E, A>,
				args?: A,
				payload?: Record<string, unknown> | null
		  ) => boolean);
}

export interface ConfigWithKeyWithSelector<T, E, A extends unknown[], S>
	extends ConfigWithKeyWithoutSelector<T, E, A> {
	selector: useSelector<T, E, A, S>;
	areEqual?: EqualityFn<S>;
}

export interface ConfigWithKeyWithoutSelector<T, E, A extends unknown[]>
	extends BaseConfig<T, E, A> {
	key: string;
}

export interface ConfigWithSourceWithSelector<T, E, A extends unknown[], S>
	extends ConfigWithSourceWithoutSelector<T, E, A> {
	selector: useSelector<T, E, A, S>;
	areEqual?: EqualityFn<S>;
}

export interface ConfigWithSourceWithoutSelector<T, E, A extends unknown[]>
	extends BaseConfig<T, E, A> {
	source: Source<T, E, A>;
}

export interface ConfigWithProducerWithSelector<T, E, A extends unknown[], S>
	extends ConfigWithProducerWithoutSelector<T, E, A> {
	selector: useSelector<T, E, A, S>;
	areEqual?: EqualityFn<S>;
}

export interface ConfigWithProducerWithoutSelector<T, E, A extends unknown[]>
	extends BaseConfig<T, E, A> {
	producer?: Producer<T, E, A>;
}

export type MixedConfig<T, E, A extends unknown[], S = State<T, E, A>> =
	| string
	| undefined
	| Source<T, E, A>
	| Producer<T, E, A>
	| ConfigWithKeyWithSelector<T, E, A, S>
	| ConfigWithKeyWithoutSelector<T, E, A>
	| ConfigWithSourceWithSelector<T, E, A, S>
	| ConfigWithSourceWithoutSelector<T, E, A>
	| ConfigWithProducerWithSelector<T, E, A, S>
	| ConfigWithProducerWithoutSelector<T, E, A>;
export type UseAsyncStateConfiguration<
	T,
	E,
	A extends unknown[],
	S = State<T, E, A>
> = {
	key?: string;
	lane?: string;
	source?: Source<T, E, A>;
	producer?: Producer<T, E, A>;
	skipPendingDelayMs?: number;
	skipPendingStatus?: boolean;
	cacheConfig?: CacheConfig<T, E, A>;
	runEffectDurationMs?: number;
	resetStateOnDispose?: boolean;
	payload?: Record<string, unknown>;
	runEffect?: RunEffect;
	initialValue?:
		| T
		| ((cache: Record<string, CachedState<T, E, A>> | null) => T);

	context?: unknown;

	/**
	 * @deprecated useAsyncState 'concurrent' option is deprecated. it will have
	 * a new
	 */
	concurrent?: boolean;

	lazy?: boolean;
	autoRunArgs?: A;
	condition?:
		| boolean
		| ((
				state: State<T, E, A>,
				args: A,
				payload: Record<string, unknown>
		  ) => boolean);
	areEqual: EqualityFn<S>;
	subscriptionKey?: string;
	selector?: useSelector<T, E, A, S>;
	events?: UseAsyncStateEvents<T, E, A>;

	// dev only
	hideFromDevtools?: boolean;
};
export type UseAsyncStateEventProps<T, E, A extends unknown[]> = {
	state: State<T, E, A>;
	source: Source<T, E, A>;
};
export type UseAsyncStateChangeEventHandler<T, E, A extends unknown[]> = (
	props: UseAsyncStateEventProps<T, E, A>
) => void;
export type UseAsyncStateEventFn<T, E, A extends unknown[]> =
	| UseAsyncStateChangeEvent<T, E, A>
	| UseAsyncStateChangeEventHandler<T, E, A>;
export type UseAsyncStateChangeEvent<T, E, A extends unknown[]> = {
	status: Status;
	handler: UseAsyncStateChangeEventHandler<T, E, A>;
};
export type UseAsyncStateEventSubscribe<T, E, A extends unknown[]> =
	| ((props: SubscribeEventProps<T, E, A>) => CleanupFn)
	| ((props: SubscribeEventProps<T, E, A>) => CleanupFn)[];
export type UseAsyncStateEventSubscribeFunction<T, E, A extends unknown[]> = (
	prevEvents?: UseAsyncStateEventSubscribe<T, E, A>
) => UseAsyncStateEventSubscribe<T, E, A>;
export type UseAsyncStateEvents<T, E, A extends unknown[]> = {
	change?: UseAsyncStateEventFn<T, E, A> | UseAsyncStateEventFn<T, E, A>[];
	subscribe?: UseAsyncStateEventSubscribe<T, E, A>;
};
export type SubscribeEventProps<T, E, A extends unknown[]> = Source<T, E, A>;
export type useSelector<T, E, A extends unknown[], S> = (
	currentState: State<T, E, A>,
	lastSuccess: LastSuccessSavedState<T, A>,
	cache: { [id: string]: CachedState<T, E, A> } | null
) => S;
export type PartialUseAsyncStateConfiguration<
	T,
	E,
	A extends unknown[],
	S
> = Partial<UseAsyncStateConfiguration<T, E, A, S>>;
export type CleanupFn = AbortFn | (() => void) | undefined;

export interface UseAsyncStateType<
	T,
	E,
	A extends unknown[],
	S = State<T, E, A>
> {
	(
		subscriptionConfig: MixedConfig<T, E, A, S>,
		dependencies?: unknown[]
	): UseAsyncState<T, E, A, S>;

	auto(
		subscriptionConfig: MixedConfig<T, E, A, S>,
		dependencies?: unknown[]
	): UseAsyncState<T, E, A, S>;

	lazy(
		subscriptionConfig: MixedConfig<T, E, A, S>,
		dependencies?: unknown[]
	): UseAsyncState<T, E, A, S>;
}

interface BaseHooksReturn<T, E, A extends unknown[], S = State<T, E, A>> {
	state: S; // backward compatibility
	source: Source<T, E, A>;
	lastSuccess: LastSuccessSavedState<T, A>;
	read(suspend?: boolean, throwError?: boolean): S;

	onChange(
		events:
			| ((prevEvents?: HookChangeEvents<T, E, A>) => void)
			| HookChangeEvents<T, E, A>
	): void;

	onSubscribe(
		events:
			| ((prevEvents?: UseAsyncStateEventSubscribe<T, E, A>) => void)
			| UseAsyncStateEventSubscribe<T, E, A>
	): void;
}

export interface HookReturnInitial<T, E, A extends unknown[], S>
	extends BaseHooksReturn<T, E, A, S> {
	isError: false;
	isInitial: true;
	isSuccess: false;
	isPending: false;

	data: T | undefined;
}

export interface HookReturnSuccess<T, E, A extends unknown[], S>
	extends BaseHooksReturn<T, E, A, S> {
	isError: false;
	isInitial: false;
	isSuccess: true;
	isPending: false;

	data: T;
}

export interface HookReturnError<T, E, A extends unknown[], S>
	extends BaseHooksReturn<T, E, A, S> {
	isError: true;
	isInitial: false;
	isSuccess: false;
	isPending: false;

	error: E;
}

export interface HookReturnPending<T, E, A extends unknown[], S>
	extends BaseHooksReturn<T, E, A, S> {
	rawState: PendingState<T, E, A>;

	isError: false;
	isPending: true;
	isInitial: false;
	isSuccess: false;
}

export type LegacyHookReturn<T, E, A extends unknown[], S = State<T, E, A>> =
	| HookReturnInitial<T, E, A, S>
	| HookReturnPending<T, E, A, S>
	| HookReturnSuccess<T, E, A, S>
	| HookReturnError<T, E, A, S>;

export type HookChangeEvents<T, E, A extends unknown[]> =
	| UseAsyncStateEventFn<T, E, A>
	| UseAsyncStateEventFn<T, E, A>[];

export type HookChangeEventsFunction<T, E, A extends unknown[]> = (
	prev?: HookChangeEvents<T, E, A>
) => HookChangeEvents<T, E, A>;

export interface HookSubscription<T, E, A extends unknown[], S>
	extends SubscriptionAlternate<T, E, A, S> {
	alternate: SubscriptionAlternate<T, E, A, S> | null;
	read(suspend?: boolean, throwError?: boolean): S;

	onChange(
		events:
			| ((prevEvents?: HookChangeEvents<T, E, A>) => void)
			| HookChangeEvents<T, E, A>
	): void;

	onSubscribe(
		events:
			| ((prevEvents?: UseAsyncStateEventSubscribe<T, E, A>) => void)
			| UseAsyncStateEventSubscribe<T, E, A>
	): void;
}

export interface SubscriptionAlternate<T, E, A extends unknown[], S> {
	deps: unknown[];
	version: number;
	instance: StateInterface<T, E, A>;
	return: LegacyHookReturn<T, E, A, S>;
	update: React.Dispatch<React.SetStateAction<number>>;

	config: PartialUseAsyncStateConfiguration<T, E, A, S>;

	// dev mode properties
	at?: string | null;
}
