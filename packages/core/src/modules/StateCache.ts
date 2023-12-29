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

export function hasCacheEnabled<TData, TArgs extends unknown[], TError>(
  instance: StateInterface<TData, TArgs, TError>
): boolean {
  return !!instance.config.cacheConfig?.enabled;
}

export function getTopLevelParent<TData, TArgs extends unknown[], TError>(
  base: StateInterface<TData, TArgs, TError>
): StateInterface<TData, TArgs, TError> {
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
  let args = props?.args || emptyArray;
  let hashFunction = hashFn ?? defaultHash;

  return hashFunction(args, payload as any);
}

export function getCachedState<TData, TArgs extends unknown[], TError>(
  instance: StateInterface<TData, TArgs, TError>,
  hash: string
): CachedState<TData, TArgs, TError> | undefined {
  let topLevelParent = getTopLevelParent(instance);

  return topLevelParent.cache?.[hash];
}

export function removeCachedStateAndSpreadOnLanes<TData, TArgs extends unknown[], TError>(
  instance: StateInterface<TData, TArgs, TError>,
  hash: string
): void {
  let topLevelParent = getTopLevelParent(instance);
  if (!topLevelParent.cache) {
    return;
  }

  delete topLevelParent.cache[hash];
  persistAndSpreadCache(topLevelParent);
}

export function persistAndSpreadCache<TData, TArgs extends unknown[], TError>(
  topLevelParent: StateInterface<TData, TArgs, TError>
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

export function spreadCacheChangeOnLanes<TData, TArgs extends unknown[], TError>(
  topLevelParent: StateInterface<TData, TArgs, TError>
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

export function saveCacheAfterSuccessfulUpdate<TData, TArgs extends unknown[], TError>(
  instance: StateInterface<TData, TArgs, TError>
) {
  let topLevelParent: StateInterface<TData, TArgs, TError> = getTopLevelParent(instance);
  let {
    config: { cacheConfig },
  } = topLevelParent;
  let state = instance.state as SuccessState<TData, TArgs>;
  let { props } = state;

  if (!topLevelParent.cache) {
    topLevelParent.cache = {};
  }

  let hashFunction = cacheConfig?.hash || defaultHash;
  let runHash = hashFunction(props?.args, props?.payload);

  if (topLevelParent.cache[runHash]?.state !== state) {
    let deadline = getStateDeadline(state, cacheConfig?.timeout);

    let cachedState = (topLevelParent.cache[runHash] = {
      deadline,
      state: state,
      addedAt: Date.now(),
    } as CachedState<TData, TArgs, TError>);

    // avoid infinity deadline timeouts
    if (cacheConfig?.auto && Number.isFinite(deadline)) {
      // after this deadline is elapsed, we would removed the cached entry
      // from the cache: only if it has the same reference.
      // because invalidateCache or replaceCache may have been called in
      // between.
      let id = setTimeout(() => {
        let topLevelParentCache = topLevelParent.cache;
        if (!topLevelParentCache) {
          return;
        }

        let currentCacheAtHash = topLevelParentCache[runHash];
        if (!currentCacheAtHash) {
          return;
        }

        if (id !== currentCacheAtHash.id) {
          // this means that this cached state's id changed, probably due
          // to some unknown error, such as persisting the cache, running
          // and forcing loading it again.
          return;
        }

        delete topLevelParentCache[runHash];
        // todo: dispatch cache change event

        // only refresh the cached state if:
        // - we have subscriptions
        // - it is the latest state
        if (
          instance.subscriptions &&
          Object.keys(instance.subscriptions).length
        ) {
          // re-run only when the current state is the same as the cached one
          // or else, when the user will want it, it won't find it in the cache
          // and thus it will request it again.
          if (instance.state === state) {
            // being the latest state, means that it we are not pending, nor
            // error, which means there has been no runs in between. so we will
            // use replay.
            // an alternative would be taking args and payload from the state
            // and invoking the run again. if the replay is proved to cause
            // issues, we will use the other alternative
            instance.actions.replay();
          }
        }
      }, deadline);
      cachedState.id = id;
    }

    if (cacheConfig && isFunction(cacheConfig.persist)) {
      cacheConfig.persist(topLevelParent.cache);
    }

    spreadCacheChangeOnLanes(topLevelParent);
  }
}

function getStateDeadline<TData, TArgs extends unknown[], TError>(
  state: SuccessState<TData, TArgs>,
  timeout?: ((currentState: State<TData, TArgs, TError>) => number) | number
) {
  // fast path for numbers
  if (timeout && !isFunction(timeout)) {
    return timeout;
  }
  let { data } = state;
  let deadline = Infinity;
  if (!timeout && data && hasHeadersSet((data as any).headers)) {
    let maybeMaxAge = readCacheControlMaxAgeHeader((data as any).headers);
    if (maybeMaxAge && maybeMaxAge > 0) {
      deadline = maybeMaxAge;
    }
  }
  if (isFunction(timeout)) {
    deadline = timeout(state);
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

export function loadCache<TData, TArgs extends unknown[], TError>(
  instance: StateInterface<TData, TArgs, TError>
) {
  if (
    !hasCacheEnabled(instance) ||
    !isFunction(instance.config.cacheConfig?.load)
  ) {
    return;
  }

  // inherit cache from the parent if exists!
  if (instance.parent) {
    let topLevelParent: StateInterface<TData, TArgs, TError> = getTopLevelParent(instance);
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
      loadedCache as Promise<Record<string, CachedState<TData, TArgs, TError>>>
    );
  } else {
    resolveCache(instance, loadedCache as Record<string, CachedState<TData, TArgs, TError>>);
  }
}

function waitForAsyncCache<TData, TArgs extends unknown[], TError>(
  instance: StateInterface<TData, TArgs, TError>,
  promise: Promise<Record<string, CachedState<TData, TArgs, TError>>>
) {
  promise.then((asyncCache) => {
    resolveCache(instance, asyncCache);
  });
}

function resolveCache<TData, TArgs extends unknown[], TError>(
  instance: StateInterface<TData, TArgs, TError>,
  resolvedCache: Record<string, CachedState<TData, TArgs, TError>>
) {
  instance.cache = resolvedCache;
  const cacheConfig = instance.config.cacheConfig;

  if (isFunction(cacheConfig!.onCacheLoad)) {
    cacheConfig!.onCacheLoad({
      cache: instance.cache,
      source: instance.actions,
    });
  }
}
