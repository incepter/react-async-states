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
	createContext(context);
	return (
		<HydrationContext.Provider value={context}>
			{children}
			{!isServer && <HydrationDom id={id} context={context} />}
			{isServer && (
				<HydrationServer id={id} context={context} exclude={exclude} />
			)}
		</HydrationContext.Provider>
	);
}
