import {
	ErrorState,
	InitialState,
	IStateFiber,
	PendingState,
	SuccessState,
} from "../core/_types";
import {
	IFiberSubscription,
	UseAsyncErrorReturn,
	UseAsyncInitialReturn,
	UseAsyncOptions,
	UseAsyncPendingReturn,
	UseAsyncReturn,
	UseAsyncSuccessReturn,
} from "./_types";

export function getFiberSubscription<T, A extends unknown[], R, P, S>(
	fiber: IStateFiber<T, A, R, P>,
	update: IFiberSubscription<T, A, R, P, S>["update"],
	start: IFiberSubscription<T, A, R, P, S>["start"],
	options: IFiberSubscription<T, A, R, P, S>["options"],
	deps: IFiberSubscription<T, A, R, P, S>["deps"]
): IFiberSubscription<T, A, R, P, S> {
	// need to annotate for the "S" ..
	let prevSubscription = findFiberSubscription<T, A, R, P, S>(fiber, update);
	if (prevSubscription) {
		return prevSubscription;
	}
	return createSubscription(fiber, update, start, options, deps);
}

export function getOrCreateSubscriptionReturn<T, A extends unknown[], R, P, S>(
	fiber: IStateFiber<T, A, R, P>,
	subscription: IFiberSubscription<T, A, R, P, S>
) {
	let alternate = subscription.alternate;

	if (!alternate) {
		throw new Error("this is a bug");
	}

	if (!subscription.return || alternate.version !== fiber.version) {
		let state = fiber.state;
		let value: S | null = null;

		if (state.status !== "error") {
			value = selectStateFromFiber(fiber, alternate.options);
		}

		alternate.version = fiber.version;
		alternate.return = createSubscriptionReturn(subscription, value);
	}

	return alternate.return;
}

function createSubscriptionReturn<T, A extends unknown[], R, P, S>(
	subscription: IFiberSubscription<T, A, R, P, S>,
	value: S | null
) {
	let fiber = subscription.fiber;
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

function findFiberSubscription<T, A extends unknown[], R, P, S>(
	fiber: IStateFiber<T, A, R, P>,
	update: IFiberSubscription<T, A, R, P, S>["update"]
): IFiberSubscription<T, A, R, P, S> | undefined {
	return fiber.listeners.get(update);
}

function createSubscription<T, A extends unknown[], R, P, S>(
	fiber: IStateFiber<T, A, R, P>,
	update: IFiberSubscription<T, A, R, P, S>["update"],
	start: IFiberSubscription<T, A, R, P, S>["start"],
	options: IFiberSubscription<T, A, R, P, S>["options"],
	deps: IFiberSubscription<T, A, R, P, S>["deps"]
): IFiberSubscription<T, A, R, P, S> {
	return {
		deps,
		fiber,
		start,
		update,
		options,
		flags: 0,
		return: null,
		callback: null,
		alternate: null,
		version: fiber.version,
	};
}

function selectStateFromFiber<T, A extends unknown[], R, P, S>(
	fiber: IStateFiber<T, A, R, P>,
	options: UseAsyncOptions<T, A, R, P, S>
) {
	if (options && typeof options === "object" && options.selector) {
		return options.selector(fiber.state);
	}
	// @ts-ignore
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
	returnedValue: UseAsyncReturn<T, A, R, P, S>
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
