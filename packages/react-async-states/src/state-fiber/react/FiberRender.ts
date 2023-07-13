import { ILibraryContext, IStateFiber } from "../core/_types";
import { IFiberSubscription, UseAsyncOptions } from "./_types";
import {
	registerSuspendingPromise,
	resolveSuspendingPromise,
} from "./FiberSuspense";
import { didDepsChange } from "../../shared";
import { emptyArray } from "../utils";
import { StateFiber } from "../core/Fiber";

export function renderFiber<T, A extends unknown[], R, P, S>(
	fiber: IStateFiber<T, A, R, P>,
	subscription: IFiberSubscription<T, A, R, P, S>,
	options: UseAsyncOptions<T, A, R, P, S>,
	deps: any[]
) {
	// this means that alternate has been constructed somewhere to make
	// this path faster
	if (
		!subscription.alternate ||
		subscription.alternate.version !== fiber.version
	) {
		subscription.alternate = {
			deps,
			options,
			flags: 0,
			return: subscription.return,
			version: subscription.version,
		};
	}

	let shouldRun = shouldSubscriptionTriggerRenderPhaseRun(subscription);

	if (shouldRun) {
		let renderRunArgs = getRenderRunArgs(options);
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

export function resolveFiber<T, A extends unknown[], R, P, S>(
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
