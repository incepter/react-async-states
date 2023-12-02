import React from "react";
import { StateInterface, HydrationData, LibraryContext } from "async-states";
import { InternalProviderServerProps, ProviderProps } from "./context";

export default function ProviderServer({
	id,
	context,
	exclude,
}: Readonly<InternalProviderServerProps>) {
	// in the server there is only one pass per request, no need to perform
	// any memoization for this.
	// in case there is states to hydrate in the client, we use a script
	// tag to append them to global window object
	let hydrationData = buildHydrationData(context, exclude);

	// when there is no data to hydrate, no need to return anything.
	if (!hydrationData) {
		return null;
	}

	return (
		<script
			// this id is important, it will allow the document.getElementById to
			// return something.
			id={id}
			dangerouslySetInnerHTML={{ __html: hydrationData }}
		></script>
	);
}

function buildWindowAssignment(str: string) {
	return `Object.assign(window.__ASYNC_STATES_HYDRATION_DATA__ || {}, ${str})`;
}

function buildHydrationData(
	context: LibraryContext,
	exclude?: ProviderProps["exclude"]
): string | null {
	let states = buildHydrationDataForAllContextPools(context, exclude);
	if (!states || Object.keys(states).length === 0) {
		return null;
	}
	try {
		// in case of multiple <Provider /> components or streaming, they should
		// append assignment using Object.assign to preserve previous hydrated data.
		let statesAsString = JSON.stringify(states);
		let assignment = buildWindowAssignment(statesAsString);
		return `window.__ASYNC_STATES_HYDRATION_DATA__ = ${assignment}`;
	} catch (e) {
		throw new Error("Error while serializing states", { cause: e });
	}
}

function shouldExcludeInstanceFromHydration(
	instance: StateInterface<any, any, any>,
	exclude: InternalProviderServerProps["exclude"]
): boolean {
	if (!exclude) {
		return false;
	}

	if (typeof exclude === "string") {
		return new RegExp(exclude).test(instance.key);
	}

	if (typeof exclude === "function") {
		return exclude(instance.key, instance.actions.getState());
	}

	return false;
}

function buildHydrationDataForAllContextPools(
	execContext: LibraryContext,
	exclude?: ProviderProps["exclude"]
): Record<string, HydrationData<unknown, unknown[], unknown>> {
	let result = {} as Record<string, HydrationData<unknown, unknown[], unknown>>;

	let allInstancesInContext = execContext.getAll();

	allInstancesInContext.forEach((instance: StateInterface<any, any, any>) => {
		let excludeInstance = shouldExcludeInstanceFromHydration(instance, exclude);

		// only include non excluded instances
		if (!excludeInstance) {
			result[`__INSTANCE__${instance.key}`] = {
				state: instance.state,
				latestRun: instance.latestRun,
				payload: instance.actions.getPayload(),
			};
		}
	});

	return result;
}
