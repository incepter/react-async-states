import { IFiberSubscription, IFiberSubscriptionAlternate } from "./_types";
import { COMMITTED, SUSPENDING } from "./FiberSubscriptionFlags";
import { isSuspending, resolveSuspendingPromise } from "./FiberSuspense";
import { dispatchNotificationExceptFor } from "../core/FiberDispatch";
import { IStateFiber } from "../core/_types";

export function commitSubscription<T, A extends unknown[], R, P, S>(
	subscription: IFiberSubscription<T, A, R, P, S>,
	alternate: IFiberSubscriptionAlternate<T, A, R, P, S>
) {
	// todo: verify subscription is painting latest version
	let fiber = subscription.fiber;
	console.log("comitting", subscription, alternate);

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

	subscription.flags |= COMMITTED;
	let unsubscribe = fiber.actions.subscribe(subscription.update, subscription);

	if (fiber.task) {
		let latestResolvedPromise = fiber.task.promise;
		if (latestResolvedPromise) {
			let suspendingUpdater = isSuspending(latestResolvedPromise);
			// if this component was the one that "suspended", when it commits again
			// it will be responsible for notifying the others
			if (
				suspendingUpdater &&
				(suspendingUpdater === subscription.update ||
					// suspendingUpdater is garbage collected happens when a component suspends
					// on the initial render, because react does not preserve
					// the identity of the state and creates another.
					// in this case, in first committing subscription will notify others
					// this does not happen on updates
					wasSuspenderGCed(fiber, suspendingUpdater))
			) {
				subscription.flags &= ~SUSPENDING;
				resolveSuspendingPromise(latestResolvedPromise);
				// todo: check if suspendingUpdater is "stale"
				console.log("sending notifications________________________");
				dispatchNotificationExceptFor(fiber, suspendingUpdater);
			}
		}
	}

	return () => {
		unsubscribe();
		subscription.flags &= ~COMMITTED;
	};
}

function wasSuspenderGCed(fiber: IStateFiber<any, any, any, any>, updater) {
	for (let t of fiber.listeners.keys()) {
		if (t === updater) {
			return false;
		}
	}
	return true;
}
