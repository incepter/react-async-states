import * as React from "react";
import {
	Fn,
	ILibraryContext,
	IStateFiber,
	IStateFiberActions,
	State
} from "../core/_types";
import { Config } from "../../v2/source";
import {StateFiberActions} from "../core/Fiber";

export type IAsyncContext = ILibraryContext;

export interface IAsyncProviderProps {
	ctx?: any;
	children: React.ReactNode;
}

export interface UseAsyncOptions<T, A extends unknown[], R, P, S>
	extends Config<T, A, R, P> {
	key: string;
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

export interface SelfHook<T, A extends unknown[], R, P, S> {
	version: number;
	return: UseAsyncReturn<T, A, R, P, S>;
	alternate: SelfHook<T, A, R, P, S> | null;
}
