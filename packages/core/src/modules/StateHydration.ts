import { HydrationData } from "../types";
import { isServer, maybeWindow } from "../utils";

let HYDRATION_DATA_KEY = "__ASYNC_STATES_HYDRATION_DATA__";

export function attemptHydratedState<T, E, R, A extends unknown[]>(
	poolName: string,
	key: string
): HydrationData<T, E, R, A> | null {
	// do not attempt hydration outside server
	if (isServer) {
		return null;
	}
	if (!maybeWindow || !maybeWindow[HYDRATION_DATA_KEY]) {
		return null;
	}

	let savedHydrationData = maybeWindow[HYDRATION_DATA_KEY];
	let name = `${poolName}__INSTANCE__${key}`;
	let maybeState = savedHydrationData[name];

	if (!maybeState) {
		return null;
	}

	delete savedHydrationData[name];
	if (Object.keys(savedHydrationData).length === 0) {
		delete maybeWindow[HYDRATION_DATA_KEY];
	}

	return maybeState as HydrationData<T, E, R, A>;
}
