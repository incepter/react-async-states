import * as React from "react";
import {
	BaseFiberConfig,
	ErrorState,
	Fn,
	ILibraryContext,
	InitialState,
	IStateFiber,
	IStateFiberActions,
	PendingState,
	State,
	SuccessState,
} from "../core/_types";

export type IAsyncContext = ILibraryContext;

export interface IAsyncProviderProps {
	ctx?: any;
	children: React.ReactNode;
}

export interface UseAsyncOptions<T, A extends unknown[], R, P, S>
	extends BaseFiberConfig<T, A, R, P> {
	args?: A;

	key: string;
	context?: any;
	producer?: Fn<T, A, R, P>;
	selector?: (p: State<T, A, R, P>) => S;
}

export type UseAsyncReturn<T, A extends unknown[], R, P, S> =
	| UseAsyncInitialReturn<T, A, R, P, S>
	| UseAsyncPendingReturn<T, A, R, P, S>
	| UseAsyncSuccessReturn<T, A, R, P, S>
	| UseAsyncErrorReturn<T, A, R, P, S>;

export interface HookSubscription<T, A extends unknown[], R, P, S> {
	flags: number;
	fiber: IStateFiber<T, A, R, P>;
	start: React.TransitionStartFunction;
	self: React.Dispatch<React.SetStateAction<S>>;
}

export interface IFiberSubscription<T, A extends unknown[], R, P, S> {
	// same as alternate
	// the alternate gets merged on commit each time it renders
	deps: any[];
	flags: number;
	version: number;
	options: UseAsyncOptions<T, A, R, P, S>;
	return: UseAsyncReturn<T, A, R, P, S> | null;

	// static per subscription
	callback: Function | null;
	fiber: IStateFiber<T, A, R, P>;
	start: React.TransitionStartFunction;
	update: React.Dispatch<React.SetStateAction<number>>;

	alternate: null | {
		deps: any[];
		flags: number;
		version: number;
		options: UseAsyncOptions<T, A, R, P, S>;
		return: UseAsyncReturn<T, A, R, P, S> | null;
	};
}

export type UseAsyncErrorReturn<T, A extends unknown[], R, P, S> = {
	state: ErrorState<A, R, P>;
	data: null;
	isError: true;
	isInitial: false;
	isPending: false;
	isSuccess: false;
	error: R;
	source: IStateFiberActions<T, A, R, P>;
};

export type UseAsyncInitialReturn<T, A extends unknown[], R, P, S> = {
	state: InitialState<T>;
	data: S;
	isError: false;
	isInitial: true;
	isPending: false;
	isSuccess: false;
	error: null;
	source: IStateFiberActions<T, A, R, P>;
};

export type UseAsyncPendingReturn<T, A extends unknown[], R, P, S> = {
	state: PendingState<T, A, R, P>;
	data: S;
	isError: false;
	isInitial: false;
	isPending: true;
	isSuccess: false;
	error: null;
	source: IStateFiberActions<T, A, R, P>;
};

export type UseAsyncSuccessReturn<T, A extends unknown[], R, P, S> = {
	state: SuccessState<T, A, P>;
	data: S;
	isError: false;
	isInitial: false;
	isPending: false;
	isSuccess: true;
	error: null;
	source: IStateFiberActions<T, A, R, P>;
};
