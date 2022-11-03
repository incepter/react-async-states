import {__DEV__} from "shared";
import {
  AbortFn,
  AsyncStateKeyOrSource,
  AsyncStateStatus,
  Source,
  State,
  StateFunctionUpdater
} from "./index";
import {
  readAsyncStateFromSource,
  standaloneProducerEffectsCreator
} from "./AsyncState";

let warnAboutSourceUtilsDeprecation;
let didWarnAboutSourceUtilsDeprecated = false;
if (__DEV__) {
  warnAboutSourceUtilsDeprecation = () => {
    if (!didWarnAboutSourceUtilsDeprecated) {
      console.error(
        `The following source utils are deprecated and are now parts of the source itself:
      \trunSource -> src.run,
      \trunpSource -> src.runp,
      \tgetState -> src.getState,
      \treplaceState -> src.setState,
      \tgetLaneSource -> src.getLaneSource,
      \tinvalidateCache -> src.invalidateCache,
      \trunpSourceLane -> src.getLaneSource.runp,
      \trunSourceLane -> src.getSourceLane(lane).run,

    They will be removed in the v1.0.0. Please update them before passing to v1.
      `);
      didWarnAboutSourceUtilsDeprecated = true;
    }
  }
}

/**
 * @deprecated
 */
export function runSource<T>(src: Source<T>, ...args): AbortFn {
  if (__DEV__) {
    warnAboutSourceUtilsDeprecation();
  }
  return runSourceLane(src, undefined, ...args);
}

/**
 * @deprecated
 */
export function runSourceLane<T>(
  src: Source<T>,
  lane: string | undefined,
  ...args
): AbortFn {
  if (__DEV__) {
    warnAboutSourceUtilsDeprecation();
  }
  return src.getLaneSource(lane).run.apply(null, args);
}


/**
 * @deprecated
 */
export function runpSource<T>(
  src: Source<T>,
  ...args
): Promise<State<T>> {
  if (__DEV__) {
    warnAboutSourceUtilsDeprecation();
  }
  return runpSourceLane(src, undefined, ...args);
}


/**
 * @deprecated
 */
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

        if (typeof unsubscribe === "function") {
          unsubscribe();
        }

        resolve(newState);
      }
    }

    asyncState.run(standaloneProducerEffectsCreator, ...args);
  });
}


/**
 * @deprecated
 */
export function invalidateCache<T>(
  src: Source<T>,
  cacheKey?: string
): void {
  if (__DEV__) {
    warnAboutSourceUtilsDeprecation();
  }
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


/**
 * @deprecated
 */
export function replaceLaneState<T>(
  src: Source<T>,
  lane: string | undefined,
  updater: T | StateFunctionUpdater<T>,
  status: AsyncStateStatus = AsyncStateStatus.success,
): void {
  if (__DEV__) {
    warnAboutSourceUtilsDeprecation();
  }
  src.getLaneSource(lane).setState.call(null, updater, status);
}


/**
 * @deprecated
 */
export function replaceState<T>(
  src: Source<T>,
  updater: T | StateFunctionUpdater<T>,
  status: AsyncStateStatus = AsyncStateStatus.success,
): void {
  if (__DEV__) {
    warnAboutSourceUtilsDeprecation();
  }
  replaceLaneState(src, undefined, updater , status)
}


/**
 * @deprecated
 */
export function getState<T>(src: Source<T>, lane?: string) {
  if (__DEV__) {
    warnAboutSourceUtilsDeprecation();
  }
  return src.getLaneSource(lane).getState();
}


/**
 * @deprecated
 */
export function getLaneSource<T>(src: Source<T>, lane?: string): Source<T> {
  if (__DEV__) {
    warnAboutSourceUtilsDeprecation();
  }
  return src.getLaneSource(lane);
}
