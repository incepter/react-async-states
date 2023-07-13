import * as React from "react";
import { UseAsyncOptions, UseAsyncReturn } from "./_types";
import { emptyArray } from "../utils";
import { useCurrentContext } from "./FiberProvider";
import {
	getFiberSubscription,
	getOrCreateSubscriptionReturn,
} from "./FiberSubscription";
import { renderFiber, resolveFiber } from "./FiberRender";
import { commitSubscription } from "./FiberCommit";

let ZERO = 0;

export function useAsync<T, A extends unknown[], R, P, S>(
	options: UseAsyncOptions<T, A, R, P, S>,
	userDeps?: any[]
): UseAsyncReturn<T, A, R, P, S> {
	let deps = userDeps || emptyArray;
	let context = useCurrentContext(options);
	let fiber = resolveFiber(context, options);

	// useSubscribeToFiber(fiber)
	let [, start] = React.useTransition();
	let [, update] = React.useState(ZERO);

	let subscription = getFiberSubscription(fiber, update, start, options, deps);
	renderFiber(fiber, subscription, options, deps);

	React.useLayoutEffect(() => commitSubscription(subscription));
	subscription.return = getOrCreateSubscriptionReturn(fiber, subscription);

	if (!subscription.return) {
		throw new Error("this is a bug");
	}

	return subscription.return;
}
