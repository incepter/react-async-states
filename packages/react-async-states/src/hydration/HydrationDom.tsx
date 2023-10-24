import React from "react";
import { HydrationData, requestContext } from "async-states";
import { HydrationProps } from "./context";
import { StateInterface } from "async-states/src";

declare global {
	interface Window {
		__ASYNC_STATES_HYDRATION_DATA__?: Record<
			string,
			HydrationData<unknown, unknown, unknown[]>
		>;
	}
}

export default function HydrationDom({ id, context }: HydrationProps) {
	let existingHtml = React.useRef<string | null>();
	let currentContext = requestContext(context);

	if (!existingHtml.current) {
		let existingContainer = document.getElementById(id);
		existingHtml.current = existingContainer && existingContainer.innerHTML;
	}

	React.useEffect(() => hydrateContext(currentContext), [context]);
	return existingHtml.current ? (
		<script
			id={id}
			dangerouslySetInnerHTML={{
				__html: existingHtml.current,
			}}
		></script>
	) : null;
}

function hydrateContext(currentContext: any) {
	let allHydrationData = window.__ASYNC_STATES_HYDRATION_DATA__;

	// nothing to do
	if (typeof allHydrationData !== "object") {
		return;
	}

	// state id is of shape: pool__instance__key
	for (let [hydrationId, hydrationData] of Object.entries(allHydrationData)) {
		let { key } = parseInstanceHydratedData(hydrationId);
		if (key) {
			let instance: StateInterface<any, any, any> = currentContext.get(key);
			if (instance) {
				instance.state = hydrationData.state;
				instance.payload = hydrationData.payload;
				instance.latestRun = hydrationData.latestRun;
				instance.actions.replaceState(instance.state); // does a notification

				delete allHydrationData[hydrationId];
			}
		}
	}
}

function parseInstanceHydratedData(hydrationId: string): {
	key?: string;
} {
	let key: string | undefined = undefined;

	if (hydrationId) {
		let matches = hydrationId.match(/__INSTANCE__(.*$)/);
		if (matches) {
			key = matches[1];
		}
	}

	return { key };
}
