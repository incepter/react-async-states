import * as React from "react";
import { createContext } from "async-states";
import { HydrationContext, HydrationProps, isServer } from "./context";
import HydrationServer from "./HydrationServer";
import HydrationDom from "./HydrationDom";

export default function Hydration({
	id,
	context,
	exclude,
	children,
}: HydrationProps) {
	if (!id) {
		throw new Error("Please give a unique id to Hydration!");
	}

	// automatically reuse parent context when there is
	let contextToUse = context;
	let parentHydrationContext = React.useContext(HydrationContext);
	if (parentHydrationContext !== null && !contextToUse) {
		contextToUse = parentHydrationContext;
	}

	createContext(contextToUse);
	return (
		<HydrationContext.Provider value={contextToUse}>
			{!isServer && <HydrationDom id={id} context={contextToUse} />}
			{isServer && (
				<HydrationServer id={id} context={contextToUse} exclude={exclude} />
			)}
			{children}
		</HydrationContext.Provider>
	);
}
