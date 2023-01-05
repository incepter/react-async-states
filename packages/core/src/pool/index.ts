import {
  AsyncState,
  Producer,
  ProducerConfig,
  Source,
  StateInterface
} from "../AsyncState";
import {__DEV__} from "../shared";
import {version} from "../../package.json";


let globalContext = window || globalThis || this || null;

let ownPool: PoolInterface = createPool("default");
let poolInUse: PoolInterface  = ownPool;

let didWarnAboutExistingInstanceRecreation = false;

export interface PoolInterface {
  name: string,
  mergePayload(payload: Record<string, any>): void,
  instances: Map<string, StateInterface<any>>,
}

export type SourcesInterface = {
  <T, E = any, R = any>(
    key: string,
    producer: Producer<T, E, R> | null | undefined,
    config: ProducerConfig<T, E, R> | undefined
  ): Source<T, E, R>,
  of<T, E = any, R = any>(key: string): Source<T, E, R> | undefined,
  for<T, E = any, R = any>(
    key: string,
    producer: Producer<T, E, R> | undefined | null,
    config: ProducerConfig<T, E, R> | undefined
  ): Source<T, E, R>,
}

export function createPool(name: string): PoolInterface {
  let instances = new Map<string, StateInterface<any>>();
  return {
    name,
    instances,
    mergePayload(payload: Record<string, any>) {
      instances.forEach(instance => instance.mergePayload(payload))
    }
  };
}


function getPoolName(name) {
  return `ASYNC-STATES-${version}-${name}-POOL`;
}

export function enableDiscovery(name: string) {
  if (!globalContext) {
    return;
  }

  let poolName = getPoolName(name);
  if (globalContext[poolName]) {
    console.error(`Pool ${poolName} already exists`);
    return;
  }

  globalContext[poolName] = ownPool;
}

// todo: to return a promise and support waiting
export function usePool(name) {
  let pool = getOrCreatePool(name);
  globalContext[pool.name] = poolInUse = pool;
}

function getPool(poolName: string) {
  if (!globalContext) {
    throw new Error(`Cannot find pool ${poolName}`);
  }
  return globalContext[poolName];
}

export function getOrCreatePool(name?: string): PoolInterface {
  if (!name) {
    return poolInUse;
  }

  let poolName = getPoolName(name);
  let candidate = getPool(poolName);

  if (!candidate) {
    return createPool(poolName);
  }

  return candidate;
}

export let Sources: SourcesInterface = Object.freeze(function create() {
  function of<T, E = any, R = any>(key: string): Source<T, E, R> | undefined {
    let instance = poolInUse.instances.get(key);
    if (instance) {
      return instance._source;
    }
    return undefined;
  }
  function output<T, E = any, R = any>(
    key: string,
    producer: Producer<T, E, R> | null | undefined,
    config: ProducerConfig<T, E, R> | undefined
  ): Source<T, E, R> {
    let candidate = poolInUse.instances.get(key);
    if (candidate) {
      if (__DEV__) {
        if (!didWarnAboutExistingInstanceRecreation) {
          console.error(`[WARNING] - A previous instance with key ${key} exists,
           calling 'createSource' with the same key will result in patching
           the producer and the config.`);
        }
      }

      let instance = candidate as StateInterface<T, E, R>;
      instance.replaceProducer(producer || undefined);
      instance.patchConfig(config);

      return instance._source;
    }

    let instance = new AsyncState(key, producer, config);

    poolInUse.instances.set(key, instance);
    return instance._source;
  }
  output.of = of;
  output.for = output;

  return output;
})();
