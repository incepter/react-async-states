import {
	CacheConfig,
	CachedState,
	RUNCProps,
	State,
	StateInterface,
	SuccessState,
} from "../types";
import { defaultHash, emptyArray, isFunction, isPromise } from "../utils";
import { now } from "../helpers/core";
import { invokeInstanceEvents } from "./StateEvent";

export function hasCacheEnabled<T, E, A extends unknown[]>(
	instance: StateInterface<T, E, A>
): boolean {
	return !!instance.config.cacheConfig?.enabled;
}

export function getTopLevelParent<T, E, A extends unknown[]>(
	base: StateInterface<T, E, A>
): StateInterface<T, E, A> {
	let current = base;
	while (current.parent) {
		current = current.parent;
	}
	return current;
}

export function computeRunHash(
	payload: unknown,
	props?: RUNCProps<any, any, any>,
	hashFn?: CacheConfig<any, any, any>["hash"]
): string {
	let hashFunction = hashFn || defaultHash;
	let args = (props && props.args) || emptyArray;

	return hashFunction(args, payload as any);
}

export function getCachedState<T, E, A extends unknown[]>(
	instance: StateInterface<T, E, A>,
	hash: string
): CachedState<T, E, A> | undefined {
	let topLevelParent = getTopLevelParent(instance);

	return topLevelParent.cache?.[hash];
}

export function removeCachedStateAndSpreadOnLanes<T, E, A extends unknown[]>(
	instance: StateInterface<T, E, A>,
	hash: string
): void {
	let topLevelParent = getTopLevelParent(instance);
	if (!topLevelParent.cache) {
		return;
	}

	delete topLevelParent.cache[hash];
	persistAndSpreadCache(topLevelParent);
}

export function persistAndSpreadCache<T, E, A extends unknown[]>(
	topLevelParent: StateInterface<T, E, A>
): void {
	if (
		topLevelParent.cache &&
		isFunction(topLevelParent.config.cacheConfig?.persist)
	) {
		topLevelParent.config.cacheConfig!.persist(topLevelParent.cache);
	}
	spreadCacheChangeOnLanes(topLevelParent);
}

export function didCachedStateExpire(cachedState: CachedState<any, any, any>) {
	const { addedAt, deadline } = cachedState;

	return addedAt + deadline < now();
}

export function spreadCacheChangeOnLanes<T, E, A extends unknown[]>(
	topLevelParent: StateInterface<T, E, A>
) {
	invokeInstanceEvents(topLevelParent, "cache-change");
	if (!topLevelParent.lanes) {
		return;
	}
	Object.values(topLevelParent.lanes).forEach((lane) => {
		lane.cache = topLevelParent.cache;
		spreadCacheChangeOnLanes(lane);
	});
}

// from remix
export function hasHeadersSet(headers: any): headers is Headers {
	return headers && isFunction(headers.get);
}

export function saveCacheAfterSuccessfulUpdate<T, E, A extends unknown[]>(
	instance: StateInterface<T, E, A>
) {
	let topLevelParent: StateInterface<T, E, A> = getTopLevelParent(instance);
	let {
		config: { cacheConfig },
	} = topLevelParent;
	let state = instance.state as SuccessState<T, A>;
	let { props } = state;

	if (!topLevelParent.cache) {
		topLevelParent.cache = {};
	}

	let hashFunction = (cacheConfig && cacheConfig.hash) || defaultHash;
	let runHash = hashFunction(props?.args, props?.payload);

	if (topLevelParent.cache[runHash]?.state !== state) {
		let deadline = getStateDeadline(state, cacheConfig?.getDeadline);
		topLevelParent.cache[runHash] = {
			deadline,
			state: state,
			addedAt: Date.now(),
		};

		if (
			topLevelParent.config.cacheConfig &&
			isFunction(topLevelParent.config.cacheConfig.persist)
		) {
			topLevelParent.config.cacheConfig.persist(topLevelParent.cache);
		}

		spreadCacheChangeOnLanes(topLevelParent);
	}
}

function getStateDeadline<T, E, A extends unknown[]>(
	state: SuccessState<T, A>,
	getDeadline?: (currentState: State<T, E, A>) => number
) {
	let { data } = state;
	let deadline = Infinity;
	if (!getDeadline && data && hasHeadersSet((data as any).headers)) {
		let maybeMaxAge = readCacheControlMaxAgeHeader((data as any).headers);
		if (maybeMaxAge && maybeMaxAge > 0) {
			deadline = maybeMaxAge;
		}
	}
	if (isFunction(getDeadline)) {
		deadline = getDeadline(state);
	}
	return deadline;
}

// https://stackoverflow.com/a/60154883/7104283
function readCacheControlMaxAgeHeader(headers: Headers): number | undefined {
	let cacheControl = headers.get("cache-control");
	if (cacheControl) {
		let matches = cacheControl.match(/max-age=(\d+)/);
		return matches ? parseInt(matches[1], 10) : undefined;
	}
}

export function loadCache<T, E, A extends unknown[]>(
	instance: StateInterface<T, E, A>
) {
	if (
		!hasCacheEnabled(instance) ||
		!isFunction(instance.config.cacheConfig?.load)
	) {
		return;
	}

	// inherit cache from the parent if exists!
	if (instance.parent) {
		let topLevelParent: StateInterface<T, E, A> = getTopLevelParent(instance);
		instance.cache = topLevelParent.cache;
		return;
	}

	let loadedCache = instance.config.cacheConfig!.load();

	if (!loadedCache) {
		return;
	}

	if (isPromise(loadedCache)) {
		waitForAsyncCache(
			instance,
			loadedCache as Promise<Record<string, CachedState<T, E, A>>>
		);
	} else {
		resolveCache(instance, loadedCache as Record<string, CachedState<T, E, A>>);
	}
}

function waitForAsyncCache<T, E, A extends unknown[]>(
	instance: StateInterface<T, E, A>,
	promise: Promise<Record<string, CachedState<T, E, A>>>
) {
	promise.then((asyncCache) => {
		resolveCache(instance, asyncCache);
	});
}

function resolveCache<T, E, A extends unknown[]>(
	instance: StateInterface<T, E, A>,
	resolvedCache: Record<string, CachedState<T, E, A>>
) {
	instance.cache = resolvedCache;
	const cacheConfig = instance.config.cacheConfig;

	if (isFunction(cacheConfig!.onCacheLoad)) {
		cacheConfig!.onCacheLoad({
			cache: instance.cache,
			setState: instance.actions.setState,
		});
	}
}