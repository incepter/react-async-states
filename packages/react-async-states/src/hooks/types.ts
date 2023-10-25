import {
	LastSuccessSavedState,
	PendingState,
	Source,
	State,
	StateInterface,
} from "async-states";
import { HookChangeEvents } from "../state-hook/StateHook";
import {
	PartialUseAsyncStateConfiguration,
	UseAsyncStateEventSubscribe,
} from "../state-hook/types.internal";

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

export type LegacyHookReturn<T, E, A extends unknown[], S> =
	| HookReturnInitial<T, E, A, S>
	| HookReturnPending<T, E, A, S>
	| HookReturnSuccess<T, E, A, S>
	| HookReturnError<T, E, A, S>;

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
