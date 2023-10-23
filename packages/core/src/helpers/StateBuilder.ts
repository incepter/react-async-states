import { initial, pending, success, error, Status } from "../enums";
import {
	ErrorState,
	InitialState,
	PendingPreviousState,
	PendingState,
	ProducerSavedProps,
	State,
	StateBuilderInterface,
	SuccessState,
} from "../types";
import { freeze, now } from "./core";

function state<T, A extends unknown[]>(
	status: Status.initial,
	data: T | undefined,
	props: ProducerSavedProps<T, A> | null,
	timestamp: number
): InitialState<T, A>;
function state<T, E, A extends unknown[]>(
	status: Status.pending,
	data: null,
	props: ProducerSavedProps<T, A> | null,
	timestamp: number
): PendingState<T, E, A>;
function state<T, A extends unknown[]>(
	status: Status.success,
	data: T,
	props: ProducerSavedProps<T, A> | null,
	timestamp: number
): SuccessState<T, A>;
function state<T, E, A extends unknown[]>(
	status: Status.error,
	data: E,
	props: ProducerSavedProps<T, A> | null,
	timestamp: number
): ErrorState<T, E, A>;
function state<T, E, R, A extends unknown[]>(
	status,
	data,
	props: ProducerSavedProps<T, A> | null,
	timestamp: number
): State<T, E, A> {
	// @ts-ignore
	return {
		status,
		data,
		props,
		timestamp,
	};
}

export const StateBuilder = freeze({
	initial<T, A extends unknown[]>(
		initialValue: T | undefined,
		props?: ProducerSavedProps<T, A> | null
	): InitialState<T, A> {
		return freeze(state<T, A>(initial, initialValue, null, now()));
	},
	error<T, E, R, A extends unknown[]>(
		data: E,
		props: ProducerSavedProps<T, A> | null
	): ErrorState<T, E, A> {
		return freeze(state<T, E, A>(error, data, props, now()));
	},
	success<T, A extends unknown[]>(
		data: T,
		props: ProducerSavedProps<T, A> | null
	): SuccessState<T, A> {
		return freeze(state<T, A>(success, data, props, now()));
	},
	pending<T, E, A extends unknown[]>(
		prev: PendingPreviousState<T, E, A>,
		props: ProducerSavedProps<T, A> | null
	): PendingState<T, E, A> {
		let pendingState = state<T, E, A>(pending, null, props, now());
		pendingState.prev = prev;
		return freeze(pendingState);
	},
}) as StateBuilderInterface;
