import * as React from "react";
import { IAsyncContext, IAsyncProviderProps, HooksStandardOptions } from "./_types";
import { requestContext } from "../core/FiberContext";
import { ILibraryContext } from "../core/_types";

export const AsyncContext = React.createContext<IAsyncContext | null>(null);

export function FiberProvider({ children, ctx }: IAsyncProviderProps) {
	let ctxToUse = ctx ?? null;
	let context = requestContext(ctxToUse);

	return (
		<AsyncContext.Provider value={context}>{children}</AsyncContext.Provider>
	);
}

export function useCurrentContext<T, A extends unknown[], R, P, S>(
	options: HooksStandardOptions<T, A, R, P, S>
): ILibraryContext {
	let reactContext = React.useContext(AsyncContext);
	let desiredContext = typeof options === "object" ? options.context : null;

	if (desiredContext) {
		return requestContext(desiredContext);
	}

	if (reactContext) {
		return reactContext;
	}

	return requestContext(null); // global context
}
