import {
  AbortFn,
  AsyncStateSource,
  AsyncStateStatus,
  State,
  StateFunctionUpdater
} from "../async-state";
import {invokeIfPresent} from "../../../shared";
import {standaloneProducerEffectsCreator} from "./producer-effects";
import {AsyncStateKeyOrSource} from "../types.internal";
import {readAsyncStateFromSource} from "../async-state/read-source";

export function runSource<T>(src: AsyncStateSource<T>, ...args): AbortFn {
  return runSourceLane(src, undefined, ...args);
}

export function runSourceLane<T>(
  src: AsyncStateSource<T>,
  lane: string | undefined,
  ...args
): AbortFn {
  return src.getLaneSource(lane).run.apply(null, args);
}

export function runpSource<T>(
  src: AsyncStateSource<T>,
  ...args
): Promise<State<T>> {
  return runpSourceLane(src, undefined, ...args);
}

export function runpSourceLane<T>(
  src: AsyncStateSource<T>,
  lane: string | undefined,
  ...args
): Promise<State<T>> {
  let asyncState = readAsyncStateFromSource(src).getLane(lane);
  return new Promise(resolve => {
    let unsubscribe = asyncState.subscribe(subscription);

    function subscription(newState: State<T>) {
      if (newState.status === AsyncStateStatus.success
        || newState.status === AsyncStateStatus.error) {
        invokeIfPresent(unsubscribe);
        resolve(newState);
      }
    }

    asyncState.run(standaloneProducerEffectsCreator, ...args);
  });
}

export function invalidateCache<T>(
  src: AsyncStateSource<T>,
  cacheKey?: string
): void {
  src.invalidateCache(cacheKey);
}

export function outsideContextRunFn<T>(
  keyOrSource: AsyncStateKeyOrSource<T>,
  ...args: any[]
) {
  if (typeof keyOrSource === "string") {
    return undefined;
  } else {
    return runSourceLane(keyOrSource, undefined, ...args);
  }
}

export function outsideContextRunLaneFn<T>(
  keyOrSource: AsyncStateKeyOrSource<T>,
  lane: string,
  ...args: any[]
) {
  if (typeof keyOrSource === "string") {
    return undefined;
  } else {
    return runSourceLane(keyOrSource, lane, ...args);
  }
}

export function insideContextRunFn<T>(context) {
  return function runImpl(
    keyOrSource: AsyncStateKeyOrSource<T>,
    ...args: any[]
  ): AbortFn {
    return context.runAsyncState(keyOrSource, undefined, ...args);
  }
}

export function insideContextRunLaneFn<T>(context) {
  return function runImpl(
    keyOrSource: AsyncStateKeyOrSource<T>,
    lane: string,
    ...args: any[]
  ): AbortFn {
    return context.runAsyncState(keyOrSource, lane, ...args);
  }
}

export function replaceLaneState<T>(
  src: AsyncStateSource<T>,
  lane: string | undefined,
  updater: T | StateFunctionUpdater<T>,
  status: AsyncStateStatus = AsyncStateStatus.success,
): void {
  src.getLaneSource(lane).setState.call(null, updater, status);
}

export function replaceState<T>(
  src: AsyncStateSource<T>,
  updater: T | StateFunctionUpdater<T>,
  status: AsyncStateStatus = AsyncStateStatus.success,
): void {
  replaceLaneState(src, undefined, updater , status)
}

export function getState<T>(src: AsyncStateSource<T>, lane?: string) {
  return src.getLaneSource(lane).getState();
}

export function getLaneSource<T>(src: AsyncStateSource<T>, lane?: string): AsyncStateSource<T> {
  return src.getLaneSource(lane);
}
