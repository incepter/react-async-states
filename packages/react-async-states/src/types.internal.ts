import { Producer, State } from "async-states";

import { EqualityFn, UseAsyncStateEvents, useSelector } from "./hooks/types";

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

export type UseConfig<T, A extends unknown[], E, S = State<T, A, E>> = {
	lane?: string;
	producer?: Producer<T, A, E>;
	payload?: Record<string, unknown>;

	lazy?: boolean;
	autoRunArgs?: A;
	areEqual?: EqualityFn<S>;
	subscriptionKey?: string;
	selector?: useSelector<T, A, E, S>;
	events?: UseAsyncStateEvents<T, A, E>;

	condition?:
		| boolean
		| ((
				state: State<T, A, E>,
				args?: A,
				payload?: Record<string, unknown> | null
		  ) => boolean);

	wait?: boolean;
};

export type {
	UseAsyncStateType,
	CleanupFn,
	PartialUseAsyncStateConfiguration,
	useSelector,
	SubscribeEventProps,
	UseAsyncStateEvents,
	UseAsyncStateEventSubscribe,
	UseAsyncStateChangeEvent,
	UseAsyncStateEventFn,
	UseAsyncStateChangeEventHandler,
	UseAsyncStateEventProps,
	UseAsyncStateConfiguration,
	MixedConfig,
	ConfigWithProducerWithoutSelector,
	ConfigWithProducerWithSelector,
	ConfigWithSourceWithoutSelector,
	ConfigWithSourceWithSelector,
	ConfigWithKeyWithoutSelector,
	ConfigWithKeyWithSelector,
	BaseConfig,
	EqualityFn,
	UseAsyncState,
} from "./hooks/types";
