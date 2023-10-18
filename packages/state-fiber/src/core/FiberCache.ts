import { CachedState, IStateFiber, RunTask, StateRoot } from "./_types";

export function hasCacheEnabled(root: StateRoot<any, any, any, any>) {
	return root.config?.cacheConfig?.enabled || false;
}

function defaultHashingFunction<A extends unknown[], P>(
	args: A,
	payload: P
): string {
	return JSON.stringify([args, payload]);
}

export function computeTaskHash<T, A extends unknown[], R, P>(
	root: StateRoot<T, A, R, P>,
	task: RunTask<T, A, R, P>
) {
	let cacheConfig = root.config!.cacheConfig;
	let { payload, args } = task;

	let hashingFunction = cacheConfig?.hash || defaultHashingFunction;

	return hashingFunction(args, payload);
}

export function requestCacheWithHash<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	taskHash: string
): CachedState<T, A, P> | null {
	let cache = fiber.cache;
	if (!cache) {
		return null;
	}
	return cache[taskHash];
}

export function shouldReplaceStateWithCache<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	existingCache: CachedState<T, A, P>
): boolean {
	let currentState = fiber.state;
	let stateFromCache = existingCache.state;

	// this tests based on equality check because we should always keep them in
	// sync. Always set the state with the cached reference.
	return !Object.is(currentState, stateFromCache);
}

export function didCachedStateExpire<T, A extends unknown[], R, P>(
	root: StateRoot<T, A, R, P>,
	existingCache: CachedState<T, A, P>
) {
	let expiryConfig = root.config?.cacheConfig?.deadline;
	if (expiryConfig === undefined) {
		// when no deadline is specified, keep the state in memory indefinitely
		return false;
	}

	let now = Date.now();
	let millisUntilExpiry =
		typeof expiryConfig === "function"
			? expiryConfig(existingCache.state)
			: expiryConfig;

	return now > millisUntilExpiry + existingCache.at;
}
