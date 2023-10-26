import { LastSuccessSavedState, StateInterface } from "../types";
import { loadCache } from "./StateCache";
import { attemptHydratedState } from "./StateHydration";
import { pending, success } from "../enums";
import { isFunction } from "../utils";
import { StateBuilder } from "../helpers/StateBuilder";

export function initializeInstance<T, A extends unknown[], E>(
	instance: StateInterface<T, A, E>
) {
	loadCache(instance);

	let maybeHydratedState = attemptHydratedState<T, A, E>(instance.key);

	if (maybeHydratedState) {
		instance.state = maybeHydratedState.state;
		instance.payload = maybeHydratedState.payload;
		instance.latestRun = maybeHydratedState.latestRun;

		if (instance.state.status === success) {
			instance.lastSuccess = instance.state;
		} else {
			let initializer = instance.config.initialValue;
			let initialData = isFunction(initializer)
				? initializer(instance.cache)
				: initializer;
			instance.lastSuccess = StateBuilder.initial(
				initialData
			) as LastSuccessSavedState<T, A>;
			if (maybeHydratedState.state.status === pending) {
				instance.promise = new Promise(() => {});
			}
		}
	} else {
		let initializer = instance.config.initialValue;
		let initialData = isFunction(initializer)
			? initializer(instance.cache)
			: (initializer as T);

		let initialState = StateBuilder.initial<T, A>(initialData);

		instance.state = initialState;
		instance.lastSuccess = initialState as LastSuccessSavedState<T, A>;
	}
}
