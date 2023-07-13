import { IFiberSubscription, UseAsyncOptions, UseAsyncReturn } from "./_types";
import { requestContext } from "../core/FiberContext";
import React from "react";
import { AsyncContext } from "./Provider";
import { ILibraryContext, IStateFiber } from "../core/_types";
import { StateFiber } from "../core/Fiber";
import {
	registerSuspendingPromise,
	resolveSuspendingPromise,
} from "./Suspense";
import { didDepsChange } from "../../shared";

let ZERO = 0;

let emptyArray = [];

export function useAsync<T, A extends unknown[], R, P, S>(
	options: UseAsyncOptions<T, A, R, P, S>,
	userDeps?: any[]
): UseAsyncReturn<T, A, R, P, S> {
	let deps = userDeps || emptyArray;
	let context = useCurrentContext(options);
	console.time("init")
	let fiber = resolveFiber(context, options);
	console.timeEnd("init")

	// useSubscribeToFiber(fiber)
	let [, start] = React.useTransition();
	let [, update] = React.useState(ZERO);
	console.time("render")
	let subscription = getFiberSubscription(fiber, update, start, options, deps);
	renderFiber(fiber, subscription, options, deps);
	console.timeEnd("render")

	subscription.return = getOrCreateSubscriptionReturn(fiber, subscription);

	React.useLayoutEffect(() => commitSubscription(subscription));

	if (!subscription.return) {
		throw new Error("this is a bug");
	}

	return subscription.return;
}

function renderFiber<T, A extends unknown[], R, P, S>(
	fiber: IStateFiber<T, A, R, P>,
	subscription: IFiberSubscription<T, A, R, P, S>,
	options: UseAsyncOptions<T, A, R, P, S>,
	deps: any[]
) {
	subscription.alternate = {
		deps,
		options,
		flags: 0,
		return: subscription.return,
		version: subscription.version,
	};

	let shouldRun = shouldSubscriptionTriggerRenderPhaseRun(subscription);
	if (shouldRun) {
		let renderRunArgs = getRenderRunArgs(options) as A;
		fiber.actions.run.apply(null, renderRunArgs);
	}

	let pending = fiber.pending;
	if (pending) {
		let promise = pending.promise;
		registerSuspendingPromise(promise!);
		throw pending.promise;
	} else {
		let task = fiber.task;
		let previousPromise = task?.promise;
		// async branch
		if (previousPromise) {
			resolveSuspendingPromise(previousPromise);
		}
		// if (fiber.state.status === "error") {
		// 	throw fiber.state.error;
		// }
	}
}

function getRenderRunArgs<T, A extends unknown[], R, P, S>(
	options: UseAsyncOptions<T, A, R, P, S>
) {
	if (!options) {
		return emptyArray as unknown as A;
	}
	return (options.args || emptyArray) as A;
}
function shouldSubscriptionTriggerRenderPhaseRun<
	T,
	A extends unknown[],
	R,
	P,
	S
>(subscription) {
	let fiber = subscription.fiber;
	let options = subscription.alternate.options;
	if (options && typeof options === "object") {
		if (
			options.lazy === false &&
			!options.args &&
			didDepsChange(options.args || emptyArray, fiber.state.args || emptyArray)
		) {
			return true;
		}
	}

	return false;
}

function getOrCreateSubscriptionReturn<T, A extends unknown[], R, P, S>(
	fiber: IStateFiber<T, A, R, P>,
	subscription: IFiberSubscription<T, A, R, P, S>
) {
	let alternate = subscription.alternate;
	if (!alternate) {
		throw new Error("this is a bug");
	}
	if (alternate.version !== fiber.version || !subscription.return) {
		let value;
		let status = fiber.state.status;
		if (status === "success" || status === "initial") {
			value = selectStateFromFiber(fiber, alternate.options);
		}

		if (!alternate.return || !Object.is(value, alternate.return.data)) {
			alternate.return = createSubscriptionReturn(subscription, value);
		}

		alternate.version = fiber.version;
	}
	return alternate.return;
}

function createSubscriptionReturn<T, A extends unknown[], R, P, S>(
	subscription: IFiberSubscription<T, A, R, P, S>,
	value
) {
	let { fiber } = subscription;
	let state = fiber.state;
	// @ts-ignore
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

function getFiberSubscription<T, A extends unknown[], R, P, S>(
	fiber: IStateFiber<T, A, R, P>,
	update: IFiberSubscription<T, A, R, P, S>["update"],
	start: IFiberSubscription<T, A, R, P, S>["start"],
	options: IFiberSubscription<T, A, R, P, S>["options"],
	deps: IFiberSubscription<T, A, R, P, S>["deps"]
): IFiberSubscription<T, A, R, P, S> {
	let prevSubscription = findFiberSubscription(fiber, update);
	if (prevSubscription) {
		return prevSubscription;
	}
	return createSubscription(fiber, update, start, options, deps);
}

function findFiberSubscription<T, A extends unknown[], R, P, S>(
	fiber: IStateFiber<T, A, R, P>,
	update: IFiberSubscription<T, A, R, P, S>["update"]
) {
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

function commitSubscription<T, A extends unknown[], R, P, S>(
	subscription: IFiberSubscription<T, A, R, P, S>
) {
	let { fiber, alternate } = subscription;

	// if alternate is falsy, this means this subscription is ran again
	// without the component rendering (StrictEffects, Offscreen .. )
	// todo: verify subscription is painting latest version
	// todo: when subscription "was suspending", it should notify other components
	//       because they may be in a pending state waiting for react to render
	//       back from suspense
	if (alternate) {
		// merge all alternate properties inside the subscription
		Object.assign(subscription, alternate);

		alternate = null;
		subscription.alternate = null;
	}

	subscription.callback = () => subscribeComponent(subscription);
	let unsubscribe = fiber.actions.subscribe(subscription.update, subscription);

	return () => {
		unsubscribe();
	};
}

function subscribeComponent<T, A extends unknown[], R, P, S>(
	subscription: IFiberSubscription<T, A, R, P, S>
) {
	let { fiber, version, return: returnedValue } = subscription;
	if (!returnedValue) {
		throw new Error("This is a bug");
	}
	if (fiber.version !== version) {
		// todo: per state status comparison
		let newValue = selectValueForSubscription(fiber, subscription);
		if (!Object.is(newValue, returnedValue!.data)) {
			subscription.update((prev) => prev + 1);
		}
	}
}

function selectValueForSubscription<T, A extends unknown[], R, P, S>(
	fiber: IStateFiber<T, A, R, P>,
	subscription: IFiberSubscription<T, A, R, P, S>
) {
	let options = subscription.options;
	if (options.selector) {
		return options.selector(fiber.state);
	}
	// @ts-ignore
	return fiber.state.data as S;
}

function selectStateFromFiber<T, A extends unknown[], R, P, S>(
	fiber: IStateFiber<T, A, R, P>,
	options: UseAsyncOptions<T, A, R, P, S>
) {
	if (options && typeof options === "object" && options.selector) {
		return options.selector(fiber.state);
	}
	// @ts-ignore
	return fiber.state.data as T;
}

function resolveFiber<T, A extends unknown[], R, P, S>(
	context: ILibraryContext,
	options: UseAsyncOptions<T, A, R, P, S>
) {
	if (typeof options === "object") {
		// todo: get rid of object destructuring
		let { key, producer, ...config } = options;
		let existingFiber = context.get(key);
		let fiberConfig = sliceFiberConfig(options);

		if (existingFiber) {
			reconcileFiberConfig(existingFiber, fiberConfig);
			return existingFiber as IStateFiber<T, A, R, P>;
		}

		let newFiber = new StateFiber(
			{ key, config: fiberConfig, fn: producer },
			context
		);
		context.set(key, newFiber); // todo: not always (standalone ;))
		return newFiber as IStateFiber<T, A, R, P>;
	}
	throw new Error("Not supported yet");
}

function sliceFiberConfig<T, A extends unknown[], R, P, S>(
	options: UseAsyncOptions<T, A, R, P, S>
) {
	return options; // todo
}

function reconcileFiberConfig<T, A extends unknown[], R, P, S>(
	fiber: IStateFiber<T, A, R, P>,
	config
) {
	// todo
}

function useCurrentContext<T, A extends unknown[], R, P, S>(
	options: UseAsyncOptions<T, A, R, P, S>
): ILibraryContext {
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
