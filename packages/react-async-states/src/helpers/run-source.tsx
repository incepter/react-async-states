import {
  AbortFn,
  AsyncStateSource,
  AsyncStateStatus,
  State
} from "../async-state";
import {invokeIfPresent} from "../../../shared";
import {readAsyncStateFromSource} from "../async-state/read-source";
import {standaloneProducerEffectsCreator} from "./producer-effects";
import {AsyncStateKeyOrSource} from "../types.internal";

export function runSource<T>(src: AsyncStateSource<T>, ...args): AbortFn {
  return runSourceLane(src, undefined, ...args);
}

export function runSourceLane<T>(
  src: AsyncStateSource<T>,
  lane: string | undefined,
  ...args
): AbortFn {
  let asyncState = readAsyncStateFromSource(src).getLane(lane);
  return asyncState.run.call(asyncState, standaloneProducerEffectsCreator, ...args);
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
  readAsyncStateFromSource(src).invalidateCache(cacheKey);
}

export function outsideContextRunFn<T>(
  keyOrSource: AsyncStateKeyOrSource<T>,
  ...args: any[]
) {
  if (typeof keyOrSource === "string") {
    return undefined;
  } else {
    return runSource(keyOrSource, undefined, ...args);
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
    return runSource(keyOrSource, lane, ...args);
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
