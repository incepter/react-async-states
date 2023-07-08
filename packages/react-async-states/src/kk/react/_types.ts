import * as React from "react";
import { Fn, ILibraryContext, IStateFiber, State } from "../core/_types";
import { Config } from "../../v2/source";

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

export interface HookSubscription<T, A extends unknown[], R, P, S> {
	flags: number;
	fiber: IStateFiber<T, A, R, P>;
	start: React.TransitionStartFunction;
	self: React.Dispatch<React.SetStateAction<S>>;
}

export interface SelfHook<T, A extends unknown[], R, P, S> {
	value: S;
	version: number;
	alternate: SelfHook<T, A, R, P, S> | null;
}
