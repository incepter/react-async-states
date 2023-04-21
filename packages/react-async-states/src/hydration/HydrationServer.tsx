import React from "react";
import {HydrationData, requestContext} from "async-states";
import {HydrationProps} from "./context";

export default function HydrationServer({
	id,
	context,
	exclude,
}: HydrationProps) {
	let hydrationData = buildHydrationData(context, exclude);
	if (!hydrationData) {
		return null;
	}
	return (
		<script
			id={id}
			dangerouslySetInnerHTML={{ __html: hydrationData }}
		></script>
	);
}

function buildHydrationData(
	context: any,
	exclude?: HydrationProps["exclude"]
): string | null {
	let states = buildHydrationDataForAllContextPools(context, exclude);
	if (!states || Object.keys(states).length === 0) {
		return null;
	}
	try {
		// in case of multiple <Hydration /> components, they should append assignment
		// using Object.assign to preserve previous hydrated data.
		let assignment = `Object.assign(window.__ASYNC_STATES_HYDRATION_DATA__ || {}, ${JSON.stringify(
			states
		)})`;
		return `window.__ASYNC_STATES_HYDRATION_DATA__ = ${assignment}`;
	} catch (e) {
		throw new Error("Error while serializing states", { cause: e });
	}
}

function shouldExcludeInstanceFromHydration(instance, exclude) {
	return (
		exclude &&
		((typeof exclude === "function" &&
			exclude(instance.key, instance.getState())) ||
			(typeof exclude === "string" && !new RegExp(exclude).test(instance.key)))
	);
}

function buildHydrationDataForAllContextPools(
	context: any,
	exclude?: HydrationProps["exclude"]
): Record<string, HydrationData<unknown, unknown, unknown, unknown[]>> {
	return Object.values(requestContext(context).pools).reduce((result, pool) => {
		pool.instances.forEach((instance) => {
			if (!shouldExcludeInstanceFromHydration(instance, exclude)) {
				result[`${pool.name}__INSTANCE__${instance.key}`] = {
					state: instance.state,
					latestRun: instance.latestRun,
					payload: instance.getPayload(),
				};
			}
		});

		return result;
	}, {} as Record<string, HydrationData<unknown, unknown, unknown, unknown[]>>);
}
