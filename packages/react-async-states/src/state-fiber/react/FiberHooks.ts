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

// useAsync suspends on pending and throws when error
// it is equivalent to using React.use()
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

// will not throw on pending and error
// will give the complete statuses, this is the old useAsyncState :)
export function useFiber() {}

// will return T directly, no selector
// it will suspend and throw on error
export function useData() {}

// will mark the fiber as a query: predefined opinionated configuration
// similar to other libraries such react-query, rtk-query and apollo
export function useQuery() {}

// will use a similar fiber to the inferred from options
// but will not impact it, it will fork it and use it
export function useParallel() {}

// will use a parallel fiber scoped to this very component
// it won't be shared to context; but should be hydrated if needed
export function useStandalone() {}

// a mutation is a normal Fiber, but with dependencies that are invalidated
// once a "success" event occurs in the mutation
export function useMutation() {}
