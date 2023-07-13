import * as React from "react";
import {
	BaseFiberConfig,
	Fn,
	ILibraryContext,
	IStateFiber,
	IStateFiberActions,
	State,
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

export interface UseAsyncReturn<T, A extends unknown[], R, P, S> {
	data: S;
	error: R;
	isError: boolean;
	isSuccess: boolean;
	isPending: boolean;
	state: State<T, A, R, P>;
	source: IStateFiberActions<T, A, R, P>;
}

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
