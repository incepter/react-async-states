import {
  AsyncStateKeyOrSource,
  getOrCreatePool,
  Source,
  StateInterface, isSource
} from "async-states";

export function run<T, E, R>(
  keyOrSource: AsyncStateKeyOrSource<T, E, R>,
  ...args: any[]
) {
  return runImpl(keyOrSource, undefined, ...args);
}

export function runLane<T, E, R>(
  keyOrSource: AsyncStateKeyOrSource<T, E, R>,
  lane: string | undefined,
  ...args: any[]
) {
  return runImpl(keyOrSource, lane, ...args);
}

function runImpl<T, E, R>(
  keyOrSource: AsyncStateKeyOrSource<T, E, R>,
  lane: string | undefined,
  ...args: any[]
) {
  if (isSource(keyOrSource)) {
    return (keyOrSource as Source<T, E, R>).getLaneSource(lane).run(...args);
  }
  if (typeof keyOrSource === "string") {
    let pool = getOrCreatePool();
    let instance = pool.instances.get(keyOrSource) as StateInterface<T, E, R>;
    if (instance) {
      return instance.run.apply(null, args);
    }
  }
  return undefined;
}
