import {
	CachedState,
	ErrorState,
	InitialState,
	LastSuccessSavedState,
	PendingState,
	Source,
	State,
	StateInterface,
	SuccessState,
	Producer,
} from "async-states";
import {
	EqualityFn,
	UseAsyncStateEvents,
	useSelector,
} from "./state-hook/types.internal";

export type {
	Source,
	CachedState,
	ErrorState,
	InitialState,
	LastSuccessSavedState,
	PendingState,
	State,
	StateFunctionUpdater,
	StateInterface,
	SuccessState,
} from "async-states";

export type {
	MixedConfig,
	UseAsyncState,
	UseAsyncStateType,
	CleanupFn,
	BaseConfig,
	EqualityFn,
	BaseUseAsyncState,
	ConfigWithKeyWithoutSelector,
	ConfigWithKeyWithSelector,
	ConfigWithProducerWithoutSelector,
	ConfigWithSourceWithoutSelector,
	ConfigWithProducerWithSelector,
	ConfigWithSourceWithSelector,
	SubscribeEventProps,
	UseAsyncStateEvents,
	UseAsyncStateEventFn,
	UseAsyncStateEventProps,
	UseAsyncStateChangeEvent,
	UseAsyncStateChangeEventHandler,
	UseAsyncStateConfiguration,
	useSelector,
	UseAsyncStateEventSubscribe,
	PartialUseAsyncStateConfiguration,
} from "./state-hook/types.internal";

export type BaseSelectorKey = string | Source<unknown, unknown, unknown[]>;

export type UseSelectorFunctionKeys = (allKeys: string[]) => BaseSelectorKey[];

export type SelectorKeysArg =
	| BaseSelectorKey
	| BaseSelectorKey[]
	| UseSelectorFunctionKeys;

export type FunctionSelector<T> = (arg: FunctionSelectorArgument) => T;
export type FunctionSelectorArgument = Record<
	string,
	FunctionSelectorItem<any, any, any> | undefined
>;

export interface InitialFunctionSelectorItem<T, E, A extends unknown[]>
	extends Partial<InitialState<T, A>> {
	key: string;
	lastSuccess?: LastSuccessSavedState<T, A>;
	cache?: Record<string, CachedState<T, E, A>> | null;
}

export interface PendingFunctionSelectorItem<T, E, A extends unknown[]>
	extends Partial<PendingState<T, E, A>> {
	key: string;
	lastSuccess?: LastSuccessSavedState<T, A>;
	cache?: Record<string, CachedState<T, E, A>> | null;
}

export interface SuccessFunctionSelectorItem<T, E, A extends unknown[]>
	extends Partial<SuccessState<T, A>> {
	key: string;
	lastSuccess?: LastSuccessSavedState<T, A>;
	cache?: Record<string, CachedState<T, E, A>> | null;
}

export interface ErrorFunctionSelectorItem<T, E, A extends unknown[]>
	extends Partial<ErrorState<T, E, A>> {
	key: string;
	lastSuccess?: LastSuccessSavedState<T, A>;
	cache?: Record<string, CachedState<T, E, A>> | null;
}

export type FunctionSelectorItem<
	T,
	E = unknown,
	A extends unknown[] = unknown[]
> =
	| InitialFunctionSelectorItem<T, E, A>
	| PendingFunctionSelectorItem<T, E, A>
	| SuccessFunctionSelectorItem<T, E, A>
	| ErrorFunctionSelectorItem<T, E, A>;

export type SimpleSelector<
	T,
	E = unknown,
	A extends unknown[] = unknown[],
	D = State<T, E, A>
> = (props: FunctionSelectorItem<T, E, A> | undefined) => D;
export type ArraySelector<T> = (
	...states: (FunctionSelectorItem<any, any, any> | undefined)[]
) => T;

export type InstanceOrNull<
	T,
	E = unknown,
	A extends unknown[] = unknown[]
> = StateInterface<T, E, A> | null;

export type UseConfig<T, E, A extends unknown[], S = State<T, E, A>> = {
	lane?: string;
	producer?: Producer<T, E, A>;
	payload?: Record<string, unknown>;

	lazy?: boolean;
	autoRunArgs?: A;
	areEqual?: EqualityFn<S>;
	subscriptionKey?: string;
	selector?: useSelector<T, E, A, S>;
	events?: UseAsyncStateEvents<T, E, A>;

	condition?:
		| boolean
		| ((
				state: State<T, E, A>,
				args?: A,
				payload?: Record<string, unknown> | null
		  ) => boolean);

	wait?: boolean;
};
