import { ILibraryContext, IStateFiber } from "../core/_types";
import {
	HooksStandardOptions,
	IFiberSubscription,
	IFiberSubscriptionAlternate,
} from "./_types";
import { isSuspending, registerSuspendingPromise } from "./FiberSuspense";
import { didDepsChange } from "../../shared";
import { emptyArray } from "../utils";
import { StateFiber } from "../core/Fiber";
import {
	CONCURRENT,
	SUSPENDING,
	THROW_ON_ERROR,
} from "./FiberSubscriptionFlags";

export function renderFiber<T, A extends unknown[], R, P, S>(
	renderFlags: number,
	subscription: IFiberSubscription<T, A, R, P, S>,
	options: HooksStandardOptions<T, A, R, P, S>,
	deps: any[]
): IFiberSubscriptionAlternate<T, A, R, P, S> {
	let fiber = subscription.fiber;
	let alternate = subscription.alternate;
	// the alternate presence means that we started rendering without committing
	// this is either because of StrictMode, Offscreen or we prepared the
	// alternate so this path would be faster
	if (!alternate || alternate.version !== fiber.version) {
		alternate = {
			deps,
			options,
			flags: renderFlags,
			return: subscription.return,
			version: subscription.version,
		};
	}

	let shouldRun = shouldRunOnRender(subscription, alternate);

	if (shouldRun) {
		let renderRunArgs = getRenderRunArgs(options);
		fiber.actions.run.apply(null, renderRunArgs);
	}

	if (renderFlags & CONCURRENT) {
		if (fiber.pending) {
			let promise = fiber.pending.promise!;
			registerSuspendingPromise(promise);
			throw promise;
		}
		let previousPromise = fiber.task?.promise;
		if (previousPromise && isSuspending(previousPromise)) {
			// we mark it as suspending, this means that this promise
			// was previously suspending a tree.
			// Since we don't know when/if react will recover from suspense,
			// we mark the alternate as being suspending, so in commit phase,
			// we will notify subscribers
			if (!(alternate.flags & SUSPENDING)) {
				alternate.flags |= SUSPENDING;
			}
		}
	}
	if (renderFlags & THROW_ON_ERROR && fiber.state.status === "error") {
		throw fiber.state.error;
	}

	return alternate;
}

function getRenderRunArgs<T, A extends unknown[], R, P, S>(
	options: HooksStandardOptions<T, A, R, P, S>
) {
	if (!options) {
		return emptyArray as unknown as A;
	}
	return (options.args || emptyArray) as A;
}

function shouldRunOnRender<T, A extends unknown[], R, P, S>(
	subscription: IFiberSubscription<T, A, R, P, S>,
	alternate: IFiberSubscriptionAlternate<T, A, R, P, S>
) {
	let fiber = subscription.fiber;
	let options = alternate.options;

	if (options && typeof options === "object") {
		if (
			options.lazy === false &&
			options.args &&
			// todo: this is wrong, do something correct
			didDepsChange(
				options.args || emptyArray,
				// @ts-ignore
				fiber.state.props.args || emptyArray
			)
		) {
			return true;
		}
	}

	return false;
}

export function resolveFiber<T, A extends unknown[], R, P, S>(
	context: ILibraryContext,
	options: HooksStandardOptions<T, A, R, P, S>
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
	options: HooksStandardOptions<T, A, R, P, S>
) {
	return options; // todo
}

function reconcileFiberConfig<T, A extends unknown[], R, P, S>(
	fiber: IStateFiber<T, A, R, P>,
	config
) {
	// todo
}
