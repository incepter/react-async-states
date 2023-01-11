import {
  AsyncStateKeyOrSource,
  Source,
  requestContext,
  StateInterface, isSource
} from "async-states";

export function run<T, E, R>(
  keyOrSource: AsyncStateKeyOrSource<T, E, R>,
  ...args: any[]
) {
  return runImpl(keyOrSource, null, undefined, ...args);
}

export function runLane<T, E, R>(
  keyOrSource: AsyncStateKeyOrSource<T, E, R>,
  lane: string | undefined,
  ...args: any[]
) {
  return runImpl(keyOrSource, null,  lane, ...args);
}
export function runInContext<T, E, R>(
  keyOrSource: AsyncStateKeyOrSource<T, E, R>,
  context: any,
  ...args: any[]
) {
  return runImpl(keyOrSource,  context, undefined, ...args);
}

export function runLaneInContext<T, E, R>(
  keyOrSource: AsyncStateKeyOrSource<T, E, R>,
  context: any,
  lane: string | undefined,
  ...args: any[]
) {
  return runImpl(keyOrSource,  context,  lane, ...args);
}

function runImpl<T, E, R>(
  keyOrSource: AsyncStateKeyOrSource<T, E, R>,
  context: any,
  lane: string | undefined,
  ...args: any[]
) {
  if (isSource(keyOrSource)) {
    return (keyOrSource as Source<T, E, R>).getLaneSource(lane).run(...args);
  }
  if (typeof keyOrSource === "string") {
    let pool = requestContext(context).getOrCreatePool();
    let instance = pool.instances.get(keyOrSource) as StateInterface<T, E, R>;
    if (instance) {
      return instance.run.apply(null, args);
    }
  }
  return undefined;
}
