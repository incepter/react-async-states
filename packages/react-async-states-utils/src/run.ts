import {
  AsyncStateKeyOrSource,
  Source,
  requestContext,
  StateInterface, isSource
} from "async-states";

export function run<T, E, R, A extends unknown[]>(
  keyOrSource: AsyncStateKeyOrSource<T, E, R, A>,
  ...args: A
) {
  return runImpl(keyOrSource, null, undefined, ...args);
}

export function runLane<T, E, R, A extends unknown[]>(
  keyOrSource: AsyncStateKeyOrSource<T, E, R, A>,
  lane: string | undefined,
  ...args: A
) {
  return runImpl(keyOrSource, null,  lane, ...args);
}
export function runInContext<T, E, R, A extends unknown[]>(
  keyOrSource: AsyncStateKeyOrSource<T, E, R, A>,
  context: any,
  ...args: A
) {
  return runImpl(keyOrSource,  context, undefined, ...args);
}

export function runLaneInContext<T, E, R, A extends unknown[]>(
  keyOrSource: AsyncStateKeyOrSource<T, E, R, A>,
  context: any,
  lane: string | undefined,
  ...args: A
) {
  return runImpl(keyOrSource,  context,  lane, ...args);
}

function runImpl<T, E, R, A extends unknown[]>(
  keyOrSource: AsyncStateKeyOrSource<T, E, R, A>,
  context: any,
  lane: string | undefined,
  ...args: A
) {
  if (isSource(keyOrSource)) {
    return (keyOrSource as Source<T, E, R, A>).getLaneSource(lane).run(...args);
  }
  if (typeof keyOrSource === "string") {
    let pool = requestContext(context).getOrCreatePool();
    let instance = pool.instances.get(keyOrSource) as StateInterface<T, E, R, A>;
    if (instance) {
      return instance.run.apply(null, args);
    }
  }
  return undefined;
}
