import { ILibraryContext, IStateFiber } from "../core/_types";
import {
	HooksStandardOptions,
	IFiberSubscription,
	IFiberSubscriptionAlternate,
} from "./_types";
import { isSuspending, registerSuspendingPromise } from "./FiberSuspense";
import { didDepsChange, emptyArray } from "../utils";
import { StateFiber } from "../core/Fiber";
import {
	CONCURRENT,
	SUSPENDING,
	THROW_ON_ERROR,
} from "./FiberSubscriptionFlags";
import {
	completeRenderPhaseRun,
	startRenderPhaseRun,
} from "./FiberSubscription";
import {
	dispatchNotificationExceptFor,
	togglePendingNotification,
} from "../core/FiberDispatch";

export function renderFiber<T, A extends unknown[], R, P, S>(
	renderFlags: number,
	subscription: IFiberSubscription<T, A, R, P, S>,
	options: HooksStandardOptions<T, A, R, P, S>
): IFiberSubscriptionAlternate<T, A, R, P, S> {
	let fiber = subscription.fiber;
	let alternate = subscription.alternate;
	// the alternate presence means that we started rendering without committing
	// this is either because of StrictMode, Offscreen or we prepared the
	// alternate so this path would be faster
	if (!alternate || alternate.version !== fiber.version) {
		alternate = {
			options,
			flags: renderFlags,
			return: subscription.return,
			version: subscription.version,
		};
	}

	if (renderFlags & CONCURRENT) {
		renderFiberConcurrent(renderFlags, subscription, alternate);
	}

	if (renderFlags & THROW_ON_ERROR && fiber.state.status === "error") {
		throw fiber.state.error;
	}

	return alternate;
}

function renderFiberConcurrent<T, A extends unknown[], R, P, S>(
	renderFlags: number,
	subscription: IFiberSubscription<T, A, R, P, S>,
	alternate: IFiberSubscriptionAlternate<T, A, R, P, S>
) {
	let fiber = subscription.fiber;
	let options = alternate.options;
	let shouldRun = shouldRunOnRender(subscription, alternate);

	if (shouldRun) {
		let renderRunArgs = getRenderRunArgs(options);
		let prev = startRenderPhaseRun();
		// we stop notifications for pending or render
		let previousNotification = togglePendingNotification(false);

		fiber.actions.run.apply(null, renderRunArgs);

		// this means that this render will suspender, so we notify other subscribers
		// since the commit phase won't get executed for this component, so basically
		// the outside world is unaware of this update
		if (renderFlags & CONCURRENT && fiber.pending) {
			dispatchNotificationExceptFor(fiber, subscription.update);
		}

		completeRenderPhaseRun(prev);
		togglePendingNotification(previousNotification);
	}

	if (fiber.pending) {
		subscription.flags |= SUSPENDING;
		let promise = fiber.pending.promise!;

		registerSuspendingPromise(promise, subscription.update);

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
	let nextOptions = alternate.options;
	let prevOptions = subscription.options;

	if (nextOptions && typeof nextOptions === "object") {
		if (nextOptions.lazy === false) {
			let state = fiber.state;
			let nextArgs = nextOptions.args || emptyArray;

			if (fiber.pending) {
				// if already pending, re-run only if args changed
				let pendingArgs = fiber.pending.args;
				return didDepsChange(pendingArgs, nextArgs);
			}

			if (state.status === "initial") {
				return true;
			}

			let fiberCurrentArgs = state.props.args;
			let didArgsChange = didDepsChange(fiberCurrentArgs, nextArgs);

			if (didArgsChange) {
				let didArgsChange = didDepsChange(
					prevOptions.args || emptyArray,
					nextArgs
				);
				return didArgsChange;
			}
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
