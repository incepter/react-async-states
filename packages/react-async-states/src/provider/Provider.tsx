import * as React from "react";
import { createContext } from "async-states";
import { Context, ProviderProps, isServer } from "./context";
import ProviderServer from "./ProviderServer";
import ProviderDom from "./ProviderDom";

// the context prop is a non-null object that can be used as a key for WeakMap
export default function Provider({
	id,
	context,
	exclude,
	children,
}: Readonly<ProviderProps>) {
	if (!id) {
		throw new Error("Please give a unique id to Provider!");
	}

	// automatically reuse parent context when there is
	let contextArg = context;
	let parentProvider = React.useContext(Context);
	if (parentProvider !== null && !contextArg) {
		contextArg = parentProvider;
	}

	// this object gets recomputed in the implementation providers, to avoid that
	// we reference it and pass it as prop
	let libraryContextObject = createContext(contextArg);

	// for further context provider optimization involving bailing out the render
	// when the children reference stays the same, we will memoize it.
	// The `exclude` property is okay not to be included because it is only used
	// in the server where we have only one render pass.
	const memoizedChildren = React.useMemo(() => {
		// in the server we insert a provider that perform automatic hydration
		// insertion. It supports exclusions
		if (isServer) {
			return (
				<>
					<ProviderServer
						id={id}
						exclude={exclude}
						context={libraryContextObject}
					/>
					{children}
				</>
			);
		}

		// in the client, all we need is the id and the context arg.
		return (
			<>
				<ProviderDom id={id} context={libraryContextObject} />
				{children}
			</>
		);
	}, [id, libraryContextObject, children]);

	// memoized children will unlock the React context children optimization:
	// if the children reference is the same as the previous render, it will
	// bail out and skip the children render and only propagates the context
	// change.
	return (
		<Context.Provider value={contextArg}>{memoizedChildren}</Context.Provider>
	);
}
