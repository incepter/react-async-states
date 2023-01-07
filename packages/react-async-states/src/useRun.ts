import {
  AsyncStateKeyOrSource,
  getOrCreatePool,
  isSource,
  Source,
  standaloneProducerEffectsCreator,
  StateInterface
} from "async-states";

function runLane<T, E, R>(
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
      return instance.run
        .bind(instance, standaloneProducerEffectsCreator)
        .apply(null, args);
    }
  }
  return undefined;
}

export let useRun = function () {
  return function run<T, E, R>(
    keyOrSource: AsyncStateKeyOrSource<T, E, R>,
    ...args: any[]
  ) {
    return runLane(keyOrSource, undefined, ...args);
  }
}
export let useRunLane = function () {
  return runLane;
}
