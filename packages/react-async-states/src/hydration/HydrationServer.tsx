import React from "react";
import { StateInterface, HydrationData, requestContext } from "async-states";
import { HydrationProps } from "./context";

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

function shouldExcludeInstanceFromHydration(
	instance: StateInterface<any, any, any>,
	exclude
) {
	return (
		exclude &&
		((typeof exclude === "function" &&
			exclude(instance.key, instance.actions.getState())) ||
			(typeof exclude === "string" && !new RegExp(exclude).test(instance.key)))
	);
}

function buildHydrationDataForAllContextPools(
	context: any,
	exclude?: HydrationProps["exclude"]
): Record<string, HydrationData<unknown, unknown, unknown[]>> {
	let execContext = requestContext(context);
	let result = {} as Record<string, HydrationData<unknown, unknown, unknown[]>>;

	let allInstancesInContext = execContext.getAll();

	allInstancesInContext.forEach((instance: StateInterface<any, any, any>) => {
		if (!shouldExcludeInstanceFromHydration(instance, exclude)) {
			result[`__INSTANCE__${instance.key}`] = {
				state: instance.state,
				latestRun: instance.latestRun,
				payload: instance.actions.getPayload(),
			};
		}
	});

	return result;
}
