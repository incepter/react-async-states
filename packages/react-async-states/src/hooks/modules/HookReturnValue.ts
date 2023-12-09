import {
	HookReturnError,
	HookReturnInitial,
	HookReturnPending,
	HookReturnSuccess,
	HookSubscription,
	LegacyHookReturn,
	PartialUseAsyncStateConfiguration,
} from "../types";
import { freeze } from "../../shared";
import {
	ErrorState,
	InitialState,
	PendingState,
	State,
	SuccessState,
} from "async-states";

export function createSubscriptionLegacyReturn<T, A extends unknown[], E, S>(
	subscription: HookSubscription<T, A, E, S>,
	config: PartialUseAsyncStateConfiguration<T, A, E, S>
): LegacyHookReturn<T, A, E, S> {
	let currentStatus = subscription.instance.state.status;

	switch (currentStatus) {
		case "initial": {
			// when config is lazy, this means we will run synchronously in the
			// layout effect phase. so we will prepare an optimistic pending state
			return createLegacyInitialReturn(subscription, config);
		}
		case "pending": {
			return createLegacyPendingReturn(subscription, config);
		}
		case "success": {
			return createLegacySuccessReturn(subscription, config);
		}
		case "error": {
			return createLegacyErrorReturn(subscription, config);
		}
		default: {
			throw new Error("Unknown status " + String(currentStatus));
		}
	}
}

export function createLegacyInitialReturn<T, A extends unknown[], E, S>(
	subscription: HookSubscription<T, A, E, S>,
	config: PartialUseAsyncStateConfiguration<T, A, E, S>
): HookReturnInitial<T, A, E, S> {
	let instance = subscription.instance;
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
		data: currentState.data ?? null,
		lastSuccess: instance.lastSuccess,

		read: subscription.read,
		onChange: subscription.onChange,
		onSubscribe: subscription.onSubscribe,
	});
}

export function createLegacySuccessReturn<T, A extends unknown[], E, S>(
	subscription: HookSubscription<T, A, E, S>,
	config: PartialUseAsyncStateConfiguration<T, A, E, S>
): HookReturnSuccess<T, A, E, S> {
	let instance = subscription.instance;
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

		error: null,
		state: selectedState,
		data: currentState.data,
		lastSuccess: instance.lastSuccess,

		read: subscription.read,
		onChange: subscription.onChange,
		onSubscribe: subscription.onSubscribe,
	});
}

export function createLegacyErrorReturn<T, A extends unknown[], E, S>(
	subscription: HookSubscription<T, A, E, S>,
	config: PartialUseAsyncStateConfiguration<T, A, E, S>
): HookReturnError<T, A, E, S> {
	let instance = subscription.instance;
	let selectedState: S;
	let lastSuccess = instance.lastSuccess;
	let currentState = instance.state as ErrorState<T, A, E>;

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
		data: lastSuccess.data ?? null,
		lastSuccess: instance.lastSuccess,

		read: subscription.read,
		onChange: subscription.onChange,
		onSubscribe: subscription.onSubscribe,
	});
}

export function createLegacyPendingReturn<T, A extends unknown[], E, S>(
	subscription: HookSubscription<T, A, E, S>,
	config: PartialUseAsyncStateConfiguration<T, A, E, S>
): HookReturnPending<T, A, E, S> {
	let instance = subscription.instance;
	let lastSuccess = instance.lastSuccess;
	let currentState = instance.state as PendingState<T, A, E>;
	let previousState = currentState.prev;

	let selectedState: S;
	if (config.selector) {
		// selector receives a "non-pending" state
		selectedState = config.selector(previousState, lastSuccess, instance.cache);
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
		data: lastSuccess.data ?? null,
		lastSuccess: instance.lastSuccess,
		error: previousState.status === "error" ? previousState.data : null,

		read: subscription.read,
		onChange: subscription.onChange,
		onSubscribe: subscription.onSubscribe,
	});
}

export function selectWholeState<T, A extends unknown[], E, S>(
	state: State<T, A, E>
): S {
	return state as S;
}
