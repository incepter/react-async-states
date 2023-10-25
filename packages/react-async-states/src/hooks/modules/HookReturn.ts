import { PartialUseAsyncStateConfiguration } from "../../state-hook/types.internal";
import {
	HookReturnError,
	HookReturnInitial,
	HookReturnPending,
	HookReturnSuccess,
	LegacyHookReturn,
} from "../types";
import { freeze } from "../../shared";
import {
	ErrorState,
	InitialState,
	PendingState,
	State,
	StateInterface,
	SuccessState,
} from "async-states";

export function createSubscriptionLegacyReturn<T, E, A extends unknown[], S>(
	instance: StateInterface<T, E, A>,
	config: PartialUseAsyncStateConfiguration<T, E, A, S>
): LegacyHookReturn<T, E, A, S> {
	let currentState = instance.state;
	let currentStatus = currentState.status;

	switch (currentStatus) {
		case "initial": {
			// when config is lazy, this means we will run synchronously in the
			// layout effect phase. so we will prepare an optimistic pending state
			return createLegacyInitialReturn(instance, config);
		}
		case "pending": {
			return createLegacyPendingReturn(instance, config);
		}
		case "success": {
			return createLegacySuccessReturn(instance, config);
		}
		case "error": {
			return createLegacyErrorReturn(instance, config);
		}
		default: {
			throw new Error("Unknown status " + String(currentStatus));
		}
	}
}

export function createLegacyInitialReturn<T, E, A extends unknown[], S>(
	instance: StateInterface<T, E, A>,
	config: PartialUseAsyncStateConfiguration<T, E, A, S>
): HookReturnInitial<T, E, A, S> {
	let selectedState: S;
	let lastSuccess = instance.lastSuccess;
	let currentState = instance.state as InitialState<T, A>;

	if (config.selector) {
		selectedState = config.selector(currentState, lastSuccess, instance.cache);
	} else {
		selectedState = currentState as S;
	}

	return freeze({
		source: instance.actions,

		isError: false,
		isInitial: true,
		isPending: false,
		isSuccess: false,

		error: null,
		state: selectedState,
		data: currentState.data,
		lastSuccess: instance.lastSuccess,

		onChange() {
			throw new Error("Not implemented yet");
		},
		onSubscribe() {
			throw new Error("Not implemented yet");
		},
	});
}

export function createLegacySuccessReturn<T, E, A extends unknown[], S>(
	instance: StateInterface<T, E, A>,
	config: PartialUseAsyncStateConfiguration<T, E, A, S>
): HookReturnSuccess<T, E, A, S> {
	let selectedState: S;
	let lastSuccess = instance.lastSuccess;
	let currentState = instance.state as SuccessState<T, A>;

	if (config.selector) {
		selectedState = config.selector(currentState, lastSuccess, instance.cache);
	} else {
		selectedState = currentState as S;
	}

	return freeze({
		source: instance.actions,

		isError: false,
		isInitial: false,
		isPending: false,
		isSuccess: true,

		state: selectedState,
		data: currentState.data,
		lastSuccess: instance.lastSuccess,

		onChange() {
			throw new Error("Not implemented yet");
		},
		onSubscribe() {
			throw new Error("Not implemented yet");
		},
	});
}

export function createLegacyErrorReturn<T, E, A extends unknown[], S>(
	instance: StateInterface<T, E, A>,
	config: PartialUseAsyncStateConfiguration<T, E, A, S>
): HookReturnError<T, E, A, S> {
	let selectedState: S;
	let lastSuccess = instance.lastSuccess;
	let currentState = instance.state as ErrorState<T, E, A>;

	if (config.selector) {
		selectedState = config.selector(currentState, lastSuccess, instance.cache);
	} else {
		selectedState = currentState as S;
	}

	return freeze({
		source: instance.actions,

		isError: true,
		isInitial: false,
		isPending: false,
		isSuccess: false,

		state: selectedState,
		error: currentState.data,
		lastSuccess: instance.lastSuccess,

		onChange() {
			throw new Error("Not implemented yet");
		},
		onSubscribe() {
			throw new Error("Not implemented yet");
		},
	});
}

export function createLegacyPendingReturn<T, E, A extends unknown[], S>(
	instance: StateInterface<T, E, A>,
	config: PartialUseAsyncStateConfiguration<T, E, A, S>
): HookReturnPending<T, E, A, S> {
	let selectedState: S;
	let lastSuccess = instance.lastSuccess;
	let currentState = instance.state as PendingState<T, E, A>;

	if (config.selector) {
		selectedState = config.selector(currentState, lastSuccess, instance.cache);
	} else {
		selectedState = currentState as S;
	}

	return freeze({
		source: instance.actions,

		isError: false,
		isPending: true,
		isInitial: false,
		isSuccess: false,

		state: selectedState,
		rawState: currentState,
		lastSuccess: instance.lastSuccess,

		onChange() {
			throw new Error("Not implemented yet");
		},
		onSubscribe() {
			throw new Error("Not implemented yet");
		},
	});
}

export function selectWholeState<T, E, A extends unknown[], S>(
	state: State<T, E, A>
): S {
  return state as S;
}
