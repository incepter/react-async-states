import * as React from "react";
import { IAsyncContext, IAsyncProviderProps } from "./_types";
import { requestContext } from "../core/FiberContext";

export const AsyncContext = React.createContext<IAsyncContext | null>(null);

export function AsyncProvider({ children, ctx }: IAsyncProviderProps) {
	let ctxToUse = ctx ?? null;
	let context = requestContext(ctxToUse);

	return (
		<AsyncContext.Provider value={context}>{children}</AsyncContext.Provider>
	);
}
