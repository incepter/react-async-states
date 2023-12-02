import * as React from "react";
import { State, requestContext, LibraryContext } from "async-states";
import { __DEV__ } from "../shared";

export let Context = React.createContext<any>(null);

export function useExecutionContext(probablyContext?: any): LibraryContext {
	let currentContext = React.useContext(Context);

	if (probablyContext) {
		return probablyContext;
	}

	if (!currentContext && isServer) {
		if (__DEV__) {
			console.error(
				"[Warning] async-states requires in a server like " +
					"environment a context per request to avoid leaking states " +
					"accidentally. To solve this issue, you should:\n\n" +
					"import { Provider } from 'react-async-states' and add it in your " +
					"tree like this: \n" +
					"<Provider id='some-id'>{children}</Provider>."
			);
		}
		throw new Error("Provider not found in the server.");
	}

	if (!currentContext) {
		return requestContext(null);
	}

	return requestContext(currentContext);
}

export let maybeWindow = typeof window !== "undefined" ? window : undefined;
export let isServer =
	typeof maybeWindow === "undefined" || "Deno" in maybeWindow;

export type ProviderProps = {
	id: string;
	context?: any;
	exclude?:
		| string
		| ((key: string, state: State<unknown, unknown[], unknown>) => boolean);
	children?: any;
};

export type InternalProviderDomProps = {
	id: string;
	context: LibraryContext;
	children?: any;
}
export type InternalProviderServerProps = {
	id: string;
	context: LibraryContext;
	exclude?:
		| string
		| ((key: string, state: State<unknown, unknown[], unknown>) => boolean);
	children?: any;
}
