import {
	InitialState,
	PendingState,
	SuccessState,
	ErrorState,
	State,
	Status,
} from "react-async-states";

type InitialExtendedState = {
	isInitial: true;
	isPending: false;
	isError: false;
	isAborted: false;
	isSuccess: false;
};
type PendingExtendedState = {
	isInitial: false;
	isPending: true;
	isError: false;
	isAborted: false;
	isSuccess: false;
};
type SuccessExtendedState = {
	isInitial: false;
	isPending: false;
	isError: false;
	isAborted: false;
	isSuccess: true;
};
type ErrorExtendedState = {
	isInitial: false;
	isPending: false;
	isError: true;
	isAborted: false;
	isSuccess: false;
};
type AbortedExtendedState = {
	isInitial: false;
	isPending: false;
	isError: false;
	isAborted: true;
	isSuccess: false;
};

export type StateWithBooleanStatus<
	T,
  A extends unknown[] = unknown[],
	E = unknown,
> =
	| (InitialState<T, A> & InitialExtendedState)
	| (PendingState<T, A, E> & PendingExtendedState)
	| (SuccessState<T, A> & SuccessExtendedState)
	| (ErrorState<T, A, E> & ErrorExtendedState);

type ExtendStatusReturn<T, A extends unknown[], E> =
	| InitialExtendedState
	| PendingExtendedState
	| SuccessExtendedState
	| AbortedExtendedState
	| ErrorExtendedState;

function extendStatus<
	T,
	E = unknown,
	R = unknown,
	A extends unknown[] = unknown[]
>(state: State<T, A, E>): ExtendStatusReturn<T, A, E> {
	let status = state.status;
	switch (status) {
		case Status.initial: {
			return {
				isInitial: true,
				isPending: false,
				isError: false,
				isAborted: false,
				isSuccess: false,
			};
		}
		case Status.pending: {
			return {
				isInitial: false,
				isPending: true,
				isError: false,
				isAborted: false,
				isSuccess: false,
			};
		}
		case Status.success: {
			return {
				isInitial: false,
				isPending: false,
				isError: false,
				isAborted: false,
				isSuccess: true,
			};
		}
		case Status.error: {
			return {
				isInitial: false,
				isPending: false,
				isError: true,
				isAborted: false,
				isSuccess: false,
			};
		}
	}
	throw new Error(`Status ${status} isn't recognized!`);
}

export function addBooleanStatus<
	T,
	E = unknown,
	R = unknown,
	A extends unknown[] = unknown[]
>(state: State<T, A, E>): StateWithBooleanStatus<T, A, E> {
	let extended = extendStatus<T, E, R>(state);
	return Object.assign({}, extended, state) as StateWithBooleanStatus<T, A, E>;
}
