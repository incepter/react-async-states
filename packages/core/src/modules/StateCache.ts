import { CacheConfig, CachedState, RUNCProps, StateInterface } from "../types";
import { defaultHash, emptyArray, isFunction } from "../utils";
import { now } from "../helpers/corejs";
import { invokeInstanceEvents } from "./StateEvent";

export function hasCacheEnabled<T, E, R, A extends unknown[]>(
	instance: StateInterface<T, E, R, A>
): boolean {
	return !!instance.config.cacheConfig?.enabled;
}

function getTopLevelParent<T, E, R, A extends unknown[]>(
	base: StateInterface<T, E, R, A>
): StateInterface<T, E, R, A> {
	let current = base;
	while (current.parent) {
		current = current.parent;
	}
	return current;
}

export function computeRunHash(
	payload: unknown,
	props?: RUNCProps<any, any, any, any>,
	hashFn?: CacheConfig<any, any, any, any>["hash"]
): string {
	let hashFunction = hashFn || defaultHash;
	let args = (props && props.args) || emptyArray;

	return hashFunction(args, payload as any);
}

export function getCachedState<T, E, R, A extends unknown[]>(
	instance: StateInterface<T, E, R, A>,
	hash: string
): CachedState<T, E, R, A> | undefined {
	let topLevelParent = getTopLevelParent(instance);

	return topLevelParent.cache?.[hash];
}

export function removeCachedStateAndSpreadOnLanes<T, E, R, A extends unknown[]>(
	instance: StateInterface<T, E, R, A>,
	hash: string
): void {
	let topLevelParent = getTopLevelParent(instance);
	if (!topLevelParent.cache) {
		return;
	}

	delete topLevelParent.cache[hash];

	if (
		topLevelParent.cache &&
		isFunction(topLevelParent.config.cacheConfig?.persist)
	) {
		topLevelParent.config.cacheConfig!.persist(topLevelParent.cache);
	}
	spreadCacheChangeOnLanes(topLevelParent);
}

export function didCachedStateExpire(
	cachedState: CachedState<any, any, any, any>
) {
	const { addedAt, deadline } = cachedState;

	return addedAt + deadline < now();
}

export function spreadCacheChangeOnLanes<T, E, R, A extends unknown[]>(
	topLevelParent: StateInterface<T, E, R, A>
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
