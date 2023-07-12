import { UseAsyncOptions, UseAsyncReturn } from "./_types";
import { requestContext } from "../core/FiberContext";
import React from "react";
import { AsyncContext } from "./Provider";
import { ILibraryContext, IStateFiber } from "../core/_types";
import { StateFiber } from "../core/Fiber";
import {
	registerSuspendingPromise,
	resolveSuspendingPromise,
} from "./Suspense";

let ZERO = 0;
export function useAsync<T, A extends unknown[], R, P, S>(
	options: UseAsyncOptions<T, A, R, P, S>,
	deps?: any[]
): UseAsyncReturn<T, A, R, P, S> {
	let context = useCurrentContext(options);
	let fiber = resolveFiber(context, options);

	// useSubscribeToFiber(fiber)
	let [start] = React.useTransition();
	let [update] = React.useState(ZERO);
	let subscription = getFiberSubscription(fiber, update, start);
	React.useLayoutEffect(() => commitSubscription(subscription));

	renderFiber(fiber, subscription, options);
	subscription.return = getOrCreateSubscriptionReturn(fiber, subscription);

	return subscription.return;
}

function renderFiber(fiber, subscription, options) {
	subscription.alternate = {
		options,
		return: subscription.return,
		version: subscription.version,
	};

	let shouldRun = shouldSubscriptionTriggerRenderPhaseRun(subscription);
	if (shouldRun) {
		let renderRunArgs = getRenderRunArgs(options);
		fiber.actions.run.apply(null, renderRunArgs);
	}

	let pending = fiber.pending;
	if (pending) {
		let promise = pending.promise;
		registerSuspendingPromise(promise);
		throw pending.promise;
	} else {
		let previousPromise = fiber.task.promise;
		// async branch
		if (previousPromise) {
			resolveSuspendingPromise(previousPromise);
		}
		if (fiber.task.status === "error") {
			throw fiber.task.error;
		}
	}
}

function getRenderRunArgs(options) {
	if (!options) {
		return [];
	}
}
function shouldSubscriptionTriggerRenderPhaseRun(subscription) {
	let fiber = subscription.fiber;
	let options = subscription.alternate.options;
	if (options && typeof options === "object") {
		if (
			options.lazy === false &&
			!options.args &&
			didArgsChange(options.args, fiber.state.args)
		) {
			return true;
		}
	}

	return false;
}

function getOrCreateSubscriptionReturn(fiber, subscription) {
	let alternate = subscription.alternate;
	if (alternate.version !== fiber.version) {
		let value;
		if (fiber.state.status === "success") {
			value = selectStateFromFiber(fiber, alternate.options);
		}

		if (!Object.is(value, alternate.return.data)) {
			alternate.return = createSubscriptionReturn(subscription, value);
		}

		alternate.version = fiber.version;
	}
	return alternate.return;
}

function createSubscriptionReturn(subscription, value) {
	let {
		fiber,
		alternate: { state },
	} = subscription;
	let { status, error } = state;

	return {
		error,
		state,
		data: value,
		source: fiber.actions,
		isError: status === "error",
		isInitial: status === "initial",
		isPending: status === "pending",
		isSuccess: status === "success",
	};
}

function getFiberSubscription(fiber, update, start) {
	let prevSubscription = findFiberSubscription(fiber, update);
	if (prevSubscription) {
		return prevSubscription;
	}
	return createSubscription(fiber, update, start);
}

function findFiberSubscription(fiber, update) {
	return fiber.listeners.get(update);
}

function createSubscription(fiber, update, start) {
	return {
		fiber,
		start,
		update,
		flags: 0,
		alternate: null,
	};
}

function commitSubscription<T, A extends unknown[], R, P, S>(subscription) {
	let { fiber, alternate, update } = subscription;

	subscription.base = alternate.base;
	subscription.flags = alternate.flags;
	subscription.return = alternate.return;
	subscription.version = alternate.version;

	alternate = null;
	subscription.alternate = null;

	let unsubscribe = fiber.subscribe(
		() => subscribeComponent(subscription),
		subscription
	);

	return () => {
		unsubscribe();
	};
}

function subscribeComponent(subscription) {
	let { fiber, return: returnedValue } = subscription.fiber;
	return function update() {
		if (fiber.version !== returnedValue.version) {
			let newValue = selectValueForSubscription(fiber, subscription);
			if (!Object.is(newValue, returnedValue.data)) {
				subscription.update((prev) => prev + 1);
			}
		}
	};
}

function selectValueForSubscription(fiber, subscription) {
	let options = subscription.options;
	if (options.selector) {
		return options.selector(fiber.state);
	}
	return fiber.state;
}

function selectStateFromFiber(fiber, options) {
	if (options && typeof options === "object" && options.selector) {
		return options.selector(fiber.state);
	}
	return fiber.state;
}

function resolveFiber<T, A extends unknown[], R, P, S>(
	context: ILibraryContext,
	options: UseAsyncOptions<T, A, R, P, S>
) {
	if (typeof options === "object") {
		let { key, producer, ...config } = options;
		let existingFiber = context.get(key);

		if (existingFiber) {
			let fiberConfig = sliceFiberConfig(options);
			reconcileFiberConfig(existingFiber, fiberConfig);
			return existingFiber as IStateFiber<T, A, R, P>;
		}

		let newFiber = new StateFiber({ key, config, fn: producer }, context);
		context.set(key, newFiber); // todo: not always (standalone ;))
		return newFiber as IStateFiber<T, A, R, P>;
	}
	throw new Error("Not supported yet");
}

function sliceFiberConfig(options) {
	return options; // todo
}

function reconcileFiberConfig(fiber, config) {
	// todo
}

function useCurrentContext(options): ILibraryContext {
	let reactContext = React.useContext(AsyncContext);
	let desiredContext = typeof options === "object" ? options.context : null;

	if (desiredContext) {
		return requestContext(desiredContext);
	}

	if (reactContext) {
		return reactContext;
	}

	return requestContext(null); // global context
}
