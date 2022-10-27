import {
  AbortFn,
  Source,
  AsyncStateStatus,
  State,
  StateFunctionUpdater
} from "./index";
import {invokeIfPresent} from "../../../shared";
import {AsyncStateKeyOrSource} from "../types.internal";
import {
  readAsyncStateFromSource,
  standaloneProducerEffectsCreator
} from "./AsyncState";

export function runSource<T>(src: Source<T>, ...args): AbortFn {
  return runSourceLane(src, undefined, ...args);
}

export function runSourceLane<T>(
  src: Source<T>,
  lane: string | undefined,
  ...args
): AbortFn {
  return src.getLaneSource(lane).run.apply(null, args);
}

export function runpSource<T>(
  src: Source<T>,
  ...args
): Promise<State<T>> {
  return runpSourceLane(src, undefined, ...args);
}

export function runpSourceLane<T>(
  src: Source<T>,
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
  src: Source<T>,
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
  src: Source<T>,
  lane: string | undefined,
  updater: T | StateFunctionUpdater<T>,
  status: AsyncStateStatus = AsyncStateStatus.success,
): void {
  src.getLaneSource(lane).setState.call(null, updater, status);
}

export function replaceState<T>(
  src: Source<T>,
  updater: T | StateFunctionUpdater<T>,
  status: AsyncStateStatus = AsyncStateStatus.success,
): void {
  replaceLaneState(src, undefined, updater , status)
}

export function getState<T>(src: Source<T>, lane?: string) {
  return src.getLaneSource(lane).getState();
}

export function getLaneSource<T>(src: Source<T>, lane?: string): Source<T> {
  return src.getLaneSource(lane);
}
