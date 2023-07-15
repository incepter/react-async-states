import * as React from "react";
import {
	HooksStandardOptions,
	LegacyHooksReturn,
	ModernHooksReturn,
} from "./_types";
import { useCurrentContext } from "./FiberProvider";
import {
	inferLegacySubscriptionReturn,
	inferModernSubscriptionReturn,
	useSubscription,
} from "./FiberSubscription";
import { renderFiber, resolveFiber } from "./FiberRender";
import { commitSubscription } from "./FiberCommit";
import { USE_ASYNC, USE_FIBER } from "./FiberSubscriptionFlags";
import { IStateFiberActions } from "../core/_types";

// useAsync suspends on pending and throws when error, like React.use()
export function useAsync<T, A extends unknown[], R, P, S>(
	options: HooksStandardOptions<T, A, R, P, S>
): ModernHooksReturn<T, A, R, P, S> {
	let context = useCurrentContext(options);
	let fiber = resolveFiber(context, options);

	let subscription = useSubscription(USE_ASYNC, fiber, options);
	let alternate = renderFiber(USE_ASYNC, subscription, options);

	React.useLayoutEffect(() => commitSubscription(subscription, alternate));
	alternate.return = inferModernSubscriptionReturn(subscription, alternate);

	alternate.version = fiber.version;

	return alternate.return;
}

// will not throw on pending and error
// will give the all statuses, this is the old useAsyncState :)
// full backward compatibility will be smooth
export function useFiber<T, A extends unknown[], R, P, S>(
	options: HooksStandardOptions<T, A, R, P, S>
): LegacyHooksReturn<T, A, R, P, S> {
	let context = useCurrentContext(options);
	let fiber = resolveFiber(context, options);

	let subscription = useSubscription(USE_FIBER, fiber, options);
	let alternate = renderFiber(USE_FIBER, subscription, options);

	React.useLayoutEffect(() => commitSubscription(subscription, alternate));
	alternate.return = inferLegacySubscriptionReturn(subscription, alternate);

	alternate.version = fiber.version;

	return alternate.return;
}

// will return data (T) directly, no selector
// it will suspend and throw on error
// it will also return the fiber source so manipulation is possible
export function useData<T, A extends unknown[], R, P>(
	options: HooksStandardOptions<T, A, R, P, T>
): [T, IStateFiberActions<T, A, R, P>] {
	let result = useAsync(options);
	return [result.data, result.source];
}

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
