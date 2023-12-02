import * as React from "react";
import { createContext } from "async-states";
import { Context, ProviderProps, isServer } from "./context";
import ProviderServer from "./ProviderServer";
import ProviderDom from "./ProviderDom";

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
	let contextToUse = context;
	let parentProvider = React.useContext(Context);
	if (parentProvider !== null && !contextToUse) {
		contextToUse = parentProvider;
	}

	createContext(contextToUse);
	return (
		<Context.Provider value={contextToUse}>
			{!isServer && <ProviderDom id={id} context={contextToUse} />}
			{isServer && (
				<ProviderServer id={id} context={contextToUse} exclude={exclude} />
			)}
			{children}
		</Context.Provider>
	);
}
