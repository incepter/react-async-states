import * as React from "react";
import {
	ErrorState,
	InitialState,
	IStateFiber,
	PendingState,
	SuccessState,
} from "../core/_types";
import {
	LegacyHooksReturn,
	IFiberSubscription,
	IFiberSubscriptionAlternate,
	ModernHooksReturn,
	UseAsyncErrorReturn,
	UseAsyncInitialReturn,
	HooksStandardOptions,
	UseAsyncPendingReturn,
	UseAsyncSuccessReturn,
} from "./_types";

let ZERO = 0;
export function useSubscription<T, A extends unknown[], R, P, S>(
	flags: number,
	fiber: IStateFiber<T, A, R, P>,
	options: HooksStandardOptions<T, A, R, P, S>,
	deps: any[]
): IFiberSubscription<T, A, R, P, S> {
	let [, start] = React.useTransition();
	let [, update] = React.useState(ZERO);

	// a subscription is a function, we use a stateUpdater as identity
	// since it is created and bound to the react state hook, so stable
	// and we use it as a source of truth.
	// this updater doesn't get retained until it gets committed
	let previousSubscription = fiber.listeners.get(update);

	if (previousSubscription) {
		// the S part may be wrong during render, but alternate will commit it
		return previousSubscription as IFiberSubscription<T, A, R, P, S>;
	}

	let subscription: IFiberSubscription<T, A, R, P, S> = {
		deps,
		flags,
		fiber,
		start,
		update,
		options,
		return: null,
		callback: null,
		alternate: null,
		version: fiber.version,
	};
	subscription.callback = () => onFiberStateChange(subscription);
	return subscription;
}

export function inferModernSubscriptionReturn<T, A extends unknown[], R, P, S>(
	subscription: IFiberSubscription<T, A, R, P, S>,
	alternate: IFiberSubscriptionAlternate<T, A, R, P, S>
): ModernHooksReturn<T, A, R, P, S> {
	let fiber = subscription.fiber;
	if (!alternate.return || alternate.version !== fiber.version) {
		let state = fiber.state;
		let value: S | null = null;

		if (state.status !== "error") {
			value = selectStateFromFiber(fiber, alternate.options);
		}

		alternate.version = fiber.version;
		alternate.return = createModernSubscriptionReturn(fiber, value);

		return alternate.return;
	}

	let prevOptions = subscription.options;
	let pendingOptions = alternate.options;

	// this means that we need to check what changed in the options
	// todo: complete this
	if (prevOptions !== pendingOptions) {
	}

	// todo: add checks in __DEV__ to throw if we encounter a legacy hook return
	return alternate.return as ModernHooksReturn<T, A, R, P, S>;
}

export function inferLegacySubscriptionReturn<T, A extends unknown[], R, P, S>(
	subscription: IFiberSubscription<T, A, R, P, S>,
	alternate: IFiberSubscriptionAlternate<T, A, R, P, S>
): LegacyHooksReturn<T, A, R, P, S> {
	let fiber = subscription.fiber;
	if (!alternate.return || alternate.version !== fiber.version) {
		let state = fiber.state;
		let value: S | null = null;

		if (state.status !== "error") {
			value = selectStateFromFiber(fiber, alternate.options);
		}

		alternate.version = fiber.version;
		alternate.return = createLegacySubscriptionReturn(fiber, value);

		return alternate.return;
	}

	let prevOptions = subscription.options;
	let pendingOptions = alternate.options;

	// this means that we need to check what changed in the options
	// todo: complete this
	if (prevOptions !== pendingOptions) {
	}

	return alternate.return;
}

function createLegacySubscriptionReturn<T, A extends unknown[], R, P, S>(
	fiber: IStateFiber<T, A, R, P>,
	value: S | null
): LegacyHooksReturn<T, A, R, P, S> {
	let state = fiber.state;

	switch (state.status) {
		case "error": {
			return createSubscriptionErrorReturn(state, fiber);
		}
		case "initial": {
			return createSubscriptionInitialReturn(state, fiber, value as S);
		}
		case "pending": {
			return createSubscriptionPendingReturn(state, fiber, value as S);
		}
		case "success": {
			return createSubscriptionSuccessReturn(state, fiber, value as S);
		}
		default: {
			throw new Error("This is a bug");
		}
	}
}
function createModernSubscriptionReturn<T, A extends unknown[], R, P, S>(
	fiber: IStateFiber<T, A, R, P>,
	value: S | null
): ModernHooksReturn<T, A, R, P, S> {
	switch (fiber.state.status) {
		case "initial": {
			return createSubscriptionInitialReturn(fiber.state, fiber, value as S);
		}
		case "success": {
			return createSubscriptionSuccessReturn(fiber.state, fiber, value as S);
		}
		case "error":
		case "pending":
		default: {
			throw new Error("This is a bug");
		}
	}
}

function createSubscriptionInitialReturn<T, A extends unknown[], R, P, S>(
	state: InitialState<T>,
	fiber: IStateFiber<T, A, R, P>,
	value: S
): UseAsyncInitialReturn<T, A, R, P, S> {
	return {
		state,
		error: null,
		data: value,
		isError: false,
		isInitial: true,
		isPending: false,
		isSuccess: false,
		source: fiber.actions,
	};
}

function createSubscriptionPendingReturn<T, A extends unknown[], R, P, S>(
	state: PendingState<T, A, R, P>,
	fiber: IStateFiber<T, A, R, P>,
	value: S
): UseAsyncPendingReturn<T, A, R, P, S> {
	return {
		state,
		data: value,
		error: null,
		isError: false,
		isInitial: false,
		isPending: true,
		isSuccess: false,
		source: fiber.actions,
	};
}

function createSubscriptionSuccessReturn<T, A extends unknown[], R, P, S>(
	state: SuccessState<T, A, P>,
	fiber: IStateFiber<T, A, R, P>,
	value: S
): UseAsyncSuccessReturn<T, A, R, P, S> {
	return {
		state,
		error: null,
		data: value,
		isError: false,
		isInitial: false,
		isPending: false,
		isSuccess: true,
		source: fiber.actions,
	};
}

function createSubscriptionErrorReturn<T, A extends unknown[], R, P, S>(
	state: ErrorState<A, R, P>,
	fiber: IStateFiber<T, A, R, P>
): UseAsyncErrorReturn<T, A, R, P, S> {
	return {
		state,
		data: null,
		isError: true,
		isInitial: false,
		isPending: false,
		isSuccess: false,
		error: state.error,
		source: fiber.actions,
	};
}

function selectStateFromFiber<T, A extends unknown[], R, P, S>(
	fiber: IStateFiber<T, A, R, P>,
	options: HooksStandardOptions<T, A, R, P, S>
) {
	if (options && typeof options === "object" && options.selector) {
		return options.selector(fiber.state);
	}
	// @ts-ignore
	// todo: fix this
	return fiber.state.data as S;
}

export function onFiberStateChange<T, A extends unknown[], R, P, S>(
	subscription: IFiberSubscription<T, A, R, P, S>
) {
	let { fiber, version, return: returnedValue } = subscription;

	if (!returnedValue) {
		throw new Error("This is a bug");
	}

	let state = fiber.state;
	if (fiber.version !== version) {
		if (state.status === "error") {
			if (!returnedValue.isError || state.error !== returnedValue.error) {
				// todo: prepare alternate for the next render
				subscription.update(forceComponentUpdate);
			}
		} else {
			// todo: bailout pending sometimes, if possible
			let newValue = selectValueForSubscription(state, subscription);
			if (
				!Object.is(newValue, returnedValue.data) ||
				doesReturnMatchFiberStatus(state.status, returnedValue)
			) {
				// todo: prepare alternate for the next render
				subscription.update(forceComponentUpdate);
			}
		}
	}
}

function forceComponentUpdate(prev: number) {
	return prev + 1;
}

function doesReturnMatchFiberStatus<T, A extends unknown[], R, P, S>(
	status: "initial" | "pending" | "success",
	returnedValue: LegacyHooksReturn<T, A, R, P, S>
) {
	if (returnedValue.isInitial && status !== "initial") {
		return false;
	}
	if (returnedValue.isSuccess && status !== "success") {
		return false;
	}
	if (returnedValue.isPending && status !== "pending") {
		return false;
	}
	return true;
}

function selectValueForSubscription<T, A extends unknown[], R, P, S>(
	state: InitialState<T> | PendingState<T, A, R, P> | SuccessState<T, A, P>,
	subscription: IFiberSubscription<T, A, R, P, S>
) {
	let options = subscription.options;
	if (options.selector) {
		return options.selector(state);
	}
	if (state.status === "pending") {
		let previousState = state.prev;
		if (previousState.status === "error") {
			return null;
		}
		return previousState.data as S;
	} else {
		return state.data as S;
	}
}
