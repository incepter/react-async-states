import { IFiberSubscription, IFiberSubscriptionAlternate } from "./_types";
import { COMMITTED } from "./FiberSubscriptionFlags";

export function commitSubscription<T, A extends unknown[], R, P, S>(
	subscription: IFiberSubscription<T, A, R, P, S>,
	alternate: IFiberSubscriptionAlternate<T, A, R, P, S>
) {
	// todo: verify subscription is painting latest version
	// todo: when subscription "was suspending", it should notify other components
	//       because they may be in a pending state waiting for react to render
	//       back from suspense
	let fiber = subscription.fiber;

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

	return () => {
		unsubscribe();
		subscription.flags &= ~COMMITTED;
	};
}
