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

export function createSubscriptionLegacyReturn<T, E, A extends unknown[], S>(
	subscription: HookSubscription<T, E, A, S>,
	config: PartialUseAsyncStateConfiguration<T, E, A, S>
): LegacyHookReturn<T, E, A, S> {
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

export function createLegacyInitialReturn<T, E, A extends unknown[], S>(
	subscription: HookSubscription<T, E, A, S>,
	config: PartialUseAsyncStateConfiguration<T, E, A, S>
): HookReturnInitial<T, E, A, S> {
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
		data: currentState.data,
		lastSuccess: instance.lastSuccess,

		read: subscription.read,
		onChange: subscription.onChange,
		onSubscribe: subscription.onSubscribe,
	});
}

export function createLegacySuccessReturn<T, E, A extends unknown[], S>(
	subscription: HookSubscription<T, E, A, S>,
	config: PartialUseAsyncStateConfiguration<T, E, A, S>
): HookReturnSuccess<T, E, A, S> {
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

		state: selectedState,
		data: currentState.data,
		lastSuccess: instance.lastSuccess,

		read: subscription.read,
		onChange: subscription.onChange,
		onSubscribe: subscription.onSubscribe,
	});
}

export function createLegacyErrorReturn<T, E, A extends unknown[], S>(
	subscription: HookSubscription<T, E, A, S>,
	config: PartialUseAsyncStateConfiguration<T, E, A, S>
): HookReturnError<T, E, A, S> {
	let instance = subscription.instance;
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

		read: subscription.read,
		onChange: subscription.onChange,
		onSubscribe: subscription.onSubscribe,
	});
}

export function createLegacyPendingReturn<T, E, A extends unknown[], S>(
	subscription: HookSubscription<T, E, A, S>,
	config: PartialUseAsyncStateConfiguration<T, E, A, S>
): HookReturnPending<T, E, A, S> {
	let instance = subscription.instance;
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

		read: subscription.read,
		onChange: subscription.onChange,
		onSubscribe: subscription.onSubscribe,
	});
}

export function selectWholeState<T, E, A extends unknown[], S>(
	state: State<T, E, A>
): S {
	return state as S;
}
