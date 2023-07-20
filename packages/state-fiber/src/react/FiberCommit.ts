import {
	HooksStandardOptions,
	IFiberSubscription,
	IFiberSubscriptionAlternate,
} from "./_types";
import { COMMITTED, CONCURRENT, SUSPENDING } from "./FiberSubscriptionFlags";
import { isSuspending, resolveSuspendingPromise } from "./FiberSuspense";
import {
	dispatchNotification,
	dispatchNotificationExceptFor,
	togglePendingNotification,
} from "../core/FiberDispatch";
import { IStateFiber } from "../core/_types";
import { ensureSubscriptionIsUpToDate } from "./FiberSubscription";
import { didDepsChange, emptyArray } from "../utils";

export function commitSubscription<T, A extends unknown[], R, P, S>(
	subscription: IFiberSubscription<T, A, R, P, S>,
	alternate: IFiberSubscriptionAlternate<T, A, R, P, S>
) {
	subscription.flags |= COMMITTED;

	let fiber = subscription.fiber;
	let committedOptions = subscription.options;

	// if alternate is falsy, this means this subscription is ran again
	// without the component rendering (StrictEffects, Offscreen .. )
	// we only assign the most recent alternate
	// being not the most recent means that react threw a render without completing
	// it, and came back to an old tree then displayed it again
	if (alternate) {
		// merge all alternate properties inside the subscription
		Object.assign(subscription, alternate);
		// only un-reference the most recent alternate
		// this inequality means that react in the mean time is preparing a render
		// in OffScreen mode
		if (subscription.alternate === alternate) {
			subscription.alternate = null;
		}
	}

	if (subscription.version !== fiber.version) {
		let didScheduleUpdate = ensureSubscriptionIsUpToDate(subscription);
		// this means that subscription was stale and did schedule an update
		// to rerender the component. no need to perform subscription since
		// we will be rendering again
		if (didScheduleUpdate) {
			return;
		}
	}

	let unsubscribe = fiber.actions.subscribe(subscription.update, subscription);

	if (subscription.flags & CONCURRENT) {
		commitConcurrentSubscription(subscription);
	} else {
		commitLegacySubscription(subscription, committedOptions);
	}

	return () => {
		unsubscribe();
		subscription.flags &= ~COMMITTED;
	};
}

function commitConcurrentSubscription<T, A extends unknown[], R, P, S>(
	subscription: IFiberSubscription<T, A, R, P, S>
) {
	let fiber = subscription.fiber;
	if (fiber.task) {
		let latestResolvedPromise = fiber.task.promise;
		if (latestResolvedPromise) {
			let suspendingUpdater = isSuspending(latestResolvedPromise);
			// if this component was the one that "suspended", when it commits again
			// it will be responsible for notifying the others
			if (
				suspendingUpdater &&
				(suspendingUpdater === subscription.update ||
					// suspendingUpdater is garbage collected happens when a component
					// suspends on the initial render, because react does not preserve
					// the identity of the state and creates another.
					// in this case, in first committing subscription will notify others
					// this does not happen on updates
					wasSuspenderGarbageCollected(fiber, suspendingUpdater))
			) {
				subscription.flags &= ~SUSPENDING;
				resolveSuspendingPromise(latestResolvedPromise);
				dispatchNotificationExceptFor(fiber, suspendingUpdater);
			}
		}
	}
}

function commitLegacySubscription<T, A extends unknown[], R, P, S>(
	subscription: IFiberSubscription<T, A, R, P, S>,
	prevOptions: HooksStandardOptions<T, A, R, P, S>
) {
	let shouldRun = shouldLegacySubscriptionRun(subscription, prevOptions);
	if (shouldRun) {
		if (shouldRun) {
			let fiber = subscription.fiber;
			let options = subscription.options;
			let renderRunArgs = (options.args || emptyArray) as A;

			// we enable notifications about "pending" updates via this
			let previousNotification = togglePendingNotification(true);

			fiber.actions.run.apply(null, renderRunArgs);

			togglePendingNotification(previousNotification);
			dispatchNotification(fiber);
		}
	}
}

function shouldLegacySubscriptionRun<T, A extends unknown[], R, P, S>(
	subscription: IFiberSubscription<T, A, R, P, S>,
	prevOptions: HooksStandardOptions<T, A, R, P, S>
) {
	let nextOptions = subscription.options;
	if (!nextOptions || nextOptions.lazy !== false) {
		return false;
	}

	let fiber = subscription.fiber;
	let prevArgs = prevOptions.args || emptyArray;
	let nextArgs = nextOptions.args || emptyArray;

	if (fiber.pending) {
		let pendingPromise = fiber.pending.promise!;
		if (isSuspending(pendingPromise)) {
			return false;
		}

		let pendingArgs = fiber.pending.args;
		return didDepsChange(pendingArgs, nextArgs);
	}

	let state = fiber.state;
	if (state.status === "initial") {
		return true;
	}

	let fiberCurrentArgs = state.props.args;
	let didArgsChange = didDepsChange(fiberCurrentArgs, nextArgs);

	if (didArgsChange) {
		return didDepsChange(prevArgs, nextArgs);
	}
}

function wasSuspenderGarbageCollected(
	fiber: IStateFiber<any, any, any, any>,
	updater
) {
	for (let t of fiber.listeners.keys()) {
		if (t === updater) {
			return false;
		}
	}
	return true;
}
