import {
	AbortFn,
	CacheConfig,
	CachedState,
	ErrorState,
	InitialState,
	LastSuccessSavedState,
	PendingState,
	Producer,
	ProducerConfig,
	RunEffect,
	Source,
	State,
	StateInterface,
	SuccessState,
} from "async-states";

export type UseAsyncState<
	T,
	A extends unknown[] = unknown[],
	E = unknown,
	S = State<T, A, E>
> = LegacyHookReturn<T, A, E, S>;
export type EqualityFn<T> = (prev: T, next: T) => boolean;

export interface BaseConfig<T, A extends unknown[], E>
	extends ProducerConfig<T, A, E> {
	key?: string;
	lane?: string;
	concurrent?: boolean;
	source?: Source<T, A, E>;
	autoRunArgs?: A;
	producer?: Producer<T, A, E>;
	subscriptionKey?: string;
	payload?: Record<string, unknown>;
	events?: UseAsyncStateEvents<T, A, E>;

	lazy?: boolean;
	condition?:
		| boolean
		| ((
				state: State<T, A, E>,
				args?: A,
				payload?: Record<string, unknown> | null
		  ) => boolean);
}

export interface ConfigWithKeyWithSelector<T, A extends unknown[], E, S>
	extends ConfigWithKeyWithoutSelector<T, A, E> {
	selector: useSelector<T, A, E, S>;
	areEqual?: EqualityFn<S>;
}

export interface ConfigWithKeyWithoutSelector<T, A extends unknown[], E>
	extends BaseConfig<T, A, E> {
	key: string;
}

export interface ConfigWithSourceWithSelector<T, A extends unknown[], E, S>
	extends ConfigWithSourceWithoutSelector<T, A, E> {
	selector: useSelector<T, A, E, S>;
	areEqual?: EqualityFn<S>;
}

export interface ConfigWithSourceWithoutSelector<T, A extends unknown[], E>
	extends BaseConfig<T, A, E> {
	source: Source<T, A, E>;
}

export interface ConfigWithProducerWithSelector<T, A extends unknown[], E, S>
	extends ConfigWithProducerWithoutSelector<T, A, E> {
	selector: useSelector<T, A, E, S>;
	areEqual?: EqualityFn<S>;
}

export interface ConfigWithProducerWithoutSelector<T, A extends unknown[], E>
	extends BaseConfig<T, A, E> {
	producer?: Producer<T, A, E>;
}

export type MixedConfig<T, A extends unknown[], E, S = State<T, A, E>> =
	| string
	| undefined
	| Source<T, A, E>
	| Producer<T, A, E>
	| ConfigWithKeyWithSelector<T, A, E, S>
	| ConfigWithKeyWithoutSelector<T, A, E>
	| ConfigWithSourceWithSelector<T, A, E, S>
	| ConfigWithSourceWithoutSelector<T, A, E>
	| ConfigWithProducerWithSelector<T, A, E, S>
	| ConfigWithProducerWithoutSelector<T, A, E>;
export type UseAsyncStateConfiguration<
	T,
	A extends unknown[],
	E,
	S = State<T, A, E>
> = {
	key?: string;
	storeInContext?: boolean;

	lane?: string;
	source?: Source<T, A, E>;
	producer?: Producer<T, A, E>;
	skipPendingDelayMs?: number;
	skipPendingStatus?: boolean;
	cacheConfig?: CacheConfig<T, A, E>;
	runEffectDurationMs?: number;
	resetStateOnDispose?: boolean;
	payload?: Record<string, unknown>;
	runEffect?: RunEffect;
	initialValue?:
		| T
		| ((cache: Record<string, CachedState<T, A, E>> | null) => T);

	context?: unknown;
	concurrent?: boolean;

	lazy?: boolean;
	autoRunArgs?: A;
	condition?:
		| boolean
		| ((
				state: State<T, A, E>,
				args: A,
				payload: Record<string, unknown>
		  ) => boolean);
	areEqual: EqualityFn<S>;
	subscriptionKey?: string;
	selector?: useSelector<T, A, E, S>;
	events?: UseAsyncStateEvents<T, A, E>;

	// dev only
	hideFromDevtools?: boolean;
};

export type UseAsyncChangeEventProps<T, A extends unknown[], E> =
	| UseAsyncStateEventPropsInitial<T, A, E>
	| UseAsyncStateEventPropsPending<T, A, E>
	| UseAsyncStateEventPropsSuccess<T, A, E>
	| UseAsyncStateEventPropsError<T, A, E>;

export type UseAsyncStateEventPropsInitial<T, A extends unknown[], E> = {
	state: InitialState<T, A>;
	source: Source<T, A, E>;
};
export type UseAsyncStateEventPropsPending<T, A extends unknown[], E> = {
	state: PendingState<T, A, E>;
	source: Source<T, A, E>;
};
export type UseAsyncStateEventPropsSuccess<T, A extends unknown[], E> = {
	state: SuccessState<T, A>;
	source: Source<T, A, E>;
};
export type UseAsyncStateEventPropsError<T, A extends unknown[], E> = {
	state: ErrorState<T, A, E>;
	source: Source<T, A, E>;
};

export type UseAsyncStateEvents<T, A extends unknown[], E> = {
	change?: UseAsyncStateEventFn<T, A, E> | UseAsyncStateEventFn<T, A, E>[];
	subscribe?: UseAsyncStateEventSubscribe<T, A, E>;
};

export type UseAsyncStateChangeEventHandler<T, A extends unknown[], E> =
	| UseAsyncChangeEventInitial<T, A, E>
	| UseAsyncChangeEventSuccess<T, A, E>
	| UseAsyncChangeEventPending<T, A, E>
	| UseAsyncStateChangeEventHandlerError<T, A, E>;

export type UseAsyncChangeEventInitial<T, A extends unknown[], E> = (
	props: UseAsyncStateEventPropsInitial<T, A, E>
) => void;
export type UseAsyncChangeEventSuccess<T, A extends unknown[], E> = (
	props: UseAsyncStateEventPropsSuccess<T, A, E>
) => void;
export type UseAsyncChangeEventPending<T, A extends unknown[], E> = (
	props: UseAsyncStateEventPropsPending<T, A, E>
) => void;
export type UseAsyncStateChangeEventHandlerError<T, A extends unknown[], E> = (
	props: UseAsyncStateEventPropsError<T, A, E>
) => void;

export type UseAsyncStateEventFn<T, A extends unknown[], E> =
	| UseAsyncStateChangeEvent<T, A, E>
	| UseAsyncStateChangeEventHandler<T, A, E>;

export type UseAsyncStateChangeEvent<T, A extends unknown[], E> =
	| UseAsyncStateChangeEventInitial<T, A, E>
	| UseAsyncStateChangeEventPending<T, A, E>
	| UseAsyncStateChangeEventSuccess<T, A, E>
	| UseAsyncStateChangeEventError<T, A, E>;

export type UseAsyncStateChangeEventInitial<T, A extends unknown[], E> = {
	status: "initial";
	handler: UseAsyncChangeEventInitial<T, A, E>;
};
export type UseAsyncStateChangeEventPending<T, A extends unknown[], E> = {
	status: "pending";
	handler: UseAsyncChangeEventPending<T, A, E>;
};
export type UseAsyncStateChangeEventSuccess<T, A extends unknown[], E> = {
	status: "success";
	handler: UseAsyncChangeEventSuccess<T, A, E>;
};
export type UseAsyncStateChangeEventError<T, A extends unknown[], E> = {
	status: "error";
	handler: UseAsyncStateChangeEventHandlerError<T, A, E>;
};

export type UseAsyncStateEventSubscribe<T, A extends unknown[], E> =
	| ((props: SubscribeEventProps<T, A, E>) => CleanupFn)
	| ((props: SubscribeEventProps<T, A, E>) => CleanupFn)[];

export type UseAsyncStateEventSubscribeFunction<T, A extends unknown[], E> = (
	prevEvents: UseAsyncStateEventSubscribe<T, A, E> | null
) => UseAsyncStateEventSubscribe<T, A, E>;

export type SubscribeEventProps<T, A extends unknown[], E> = Source<T, A, E>;
export type useSelector<T, A extends unknown[], E, S> = (
	currentState: State<T, A, E>,
	lastSuccess: LastSuccessSavedState<T, A>,
	cache: { [id: string]: CachedState<T, A, E> } | null
) => S;

export type PartialUseAsyncConfig<T, A extends unknown[], E, S> = Partial<
	UseAsyncStateConfiguration<T, A, E, S>
>;

export type CleanupFn = AbortFn | (() => void) | undefined;

interface BaseHooksReturn<T, A extends unknown[], E, S = State<T, A, E>> {
	source: Source<T, A, E>;
	read(suspend?: boolean, throwError?: boolean): S;

	onChange(
		events:
			| ((prevEvents: HookChangeEvents<T, A, E> | null) => void)
			| HookChangeEvents<T, A, E>
	): void;

	onSubscribe(
		events:
			| ((prevEvents: UseAsyncStateEventSubscribe<T, A, E> | null) => void)
			| UseAsyncStateEventSubscribe<T, A, E>
	): void;
}

export interface HookReturnInitial<T, A extends unknown[], E, S>
	extends BaseHooksReturn<T, A, E, S> {
	state: S;

	isError: false;
	isInitial: true;
	isSuccess: false;
	isPending: false;

	error: null;
	data: T | null;
}

export interface HookReturnSuccess<T, A extends unknown[], E, S>
	extends BaseHooksReturn<T, A, E, S> {
	state: S;

	isError: false;
	isInitial: false;
	isSuccess: true;
	isPending: false;

	data: T;
	error: null;
}

export interface HookReturnError<T, A extends unknown[], E, S>
	extends BaseHooksReturn<T, A, E, S> {
	state: S;

	isError: true;
	isInitial: false;
	isSuccess: false;
	isPending: false;

	error: E;
	data: T | null;
}

export interface HookReturnPending<T, A extends unknown[], E, S>
	extends BaseHooksReturn<T, A, E, S> {
	state: S;

	isError: false;
	isPending: true;
	isInitial: false;
	isSuccess: false;

	data: T | null;
	error: E | null;
}

export type LegacyHookReturn<T, A extends unknown[], E, S = State<T, A, E>> =
	| HookReturnInitial<T, A, E, S>
	| HookReturnPending<T, A, E, S>
	| HookReturnSuccess<T, A, E, S>
	| HookReturnError<T, A, E, S>;

export type HookChangeEvents<T, A extends unknown[], E> =
	| UseAsyncStateEventFn<T, A, E>
	| UseAsyncStateEventFn<T, A, E>[];

export type HookChangeEventsFunction<T, A extends unknown[], E> = (
	prev: HookChangeEvents<T, A, E> | null
) => HookChangeEvents<T, A, E>;

export interface HookSubscription<T, A extends unknown[], E, S>
	extends SubscriptionAlternate<T, A, E, S> {
	alternate: SubscriptionAlternate<T, A, E, S> | null;
	read(suspend?: boolean, throwError?: boolean): S;

	changeEvents: HookChangeEvents<T, A, E> | null;
	subscribeEvents: UseAsyncStateEventSubscribe<T, A, E> | null;
	onChange(
		events:
			| ((prevEvents: HookChangeEvents<T, A, E> | null) => void)
			| HookChangeEvents<T, A, E>
	): void;

	onSubscribe(
		events:
			| ((prevEvents: UseAsyncStateEventSubscribe<T, A, E> | null) => void)
			| UseAsyncStateEventSubscribe<T, A, E>
	): void;
}

export interface SubscriptionAlternate<T, A extends unknown[], E, S> {
	deps: unknown[];
	version: number;
	instance: StateInterface<T, A, E>;
	return: LegacyHookReturn<T, A, E, S>;
	update: React.Dispatch<React.SetStateAction<number>>;

	config: PartialUseAsyncConfig<T, A, E, S>;

	// dev mode properties
	at?: string | null;
	__DEV__?: {
		didAddLastSuccessGetter: boolean;
		didWarnAboutLastSuccessUsage: boolean;
	};
}

// useData will suspend initially to get data, otherwise it will give the
// previously existing data.
// if initialValue is provided, it won't suspend and just return it
// no cache by default unless provided by the source or options
// let [count, {setState}] = useData({ key: "count", initialValue: 0 })
type UseDataReturn<TData, TArgs extends unknown[], TError> = [
	TData,
	{
		isPending: boolean;
		error: TError | null;
		source: Source<TData, TArgs, TError>;
	}
];

// no suspending unless read is called in userland
// will automatically refetch data after a state time is elapsed
// will automatically refetch on window focus and stale data
interface UseQueryReturn<TData, TArgs extends unknown[], TError>
	extends Omit<BaseHooksReturn<TData, TArgs, TError>, "lastSuccess"> {
	isPending: boolean;

	data: TData | null;
	error: TError | null;
}
