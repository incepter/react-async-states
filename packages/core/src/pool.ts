import {
  AbortFn,
  AsyncStatePools,
  PoolInterface,
  StateInterface,
  WatchCallback
} from "./types";
import {version} from "../package.json";
import {__DEV__, maybeWindow} from "./utils";

export let ownLibraryPools = {} as AsyncStatePools;
let LIBRARY_POOLS_PROPERTY = "__ASYNC_STATES_POOLS__";
let globalContext = maybeWindow || globalThis || null;
export let ownPool: PoolInterface = createPool("default");
let didWarnAboutExistingInstanceRecreation = false;

ownLibraryPools[ownPool.name] = ownPool;
export let poolInUse: PoolInterface = ownPool;
function getLibraryPools(): AsyncStatePools {
  return ownLibraryPools;
}

export function createPool(name: string): PoolInterface {
  let meter = 0;
  let watchers = {};
  let listeners = {};
  let instances = new Map<string, StateInterface<any>>();
  return {
    version,
    instances,
    simpleName: name,
    name: getPoolName(name),

    set,
    watch,
    listen,
    mergePayload,
  };

  function set(key: string, instance: StateInterface<any>) {
    if (!key) {
      return;
    }
    instances.set(key, instance);
    notifyWatchers(key, instance);
  }

  function mergePayload(payload: Record<string, any>) {
    instances.forEach(instance => instance.mergePayload(payload))
  }

  function listen<T, E, R>(notify: WatchCallback<T, E, R>): AbortFn {
    let didClean = false;
    let index = ++meter;

    function cb(argv: StateInterface<T, E, R> | null, notifKey: string) {
      if (!didClean) {
        notify(argv, notifKey);
      }
    }

    function cleanup() {
      didClean = true;
      delete listeners[index];
    }

    listeners[index] = {cb, cleanup};
    return cleanup;
  }


  function watch<T, E, R>(
    key: string, notify: WatchCallback<T, E, R>): AbortFn {
    if (!watchers[key]) {
      watchers[key] = {};
    }
    let didClean = false;
    let index = ++meter;

    function cb(argv: StateInterface<T, E, R> | null, notifKey: string) {
      if (!didClean) {
        notify(argv, notifKey);
      }
    }

    function cleanup() {
      didClean = true;
      delete watchers[key][index];
    }

    watchers[key][index] = {cb, cleanup};


    return cleanup;
  }


  function notifyWatchers<T, E, R>(
    key: string, value: StateInterface<T, E, R> | null): void {
    Promise.resolve().then(function notify() {
      let callbacks: {
        cleanup: AbortFn,
        cb: WatchCallback<any>
      }[] = Object.values(listeners);

      if (watchers[key]) {
        callbacks = Object.values(watchers[key]);
      }

      callbacks.forEach(function notifyWatcher(watcher) {
        watcher.cb(value, key);
      });
    });
  }
}

function getPoolName(name: string) {
  return `ASYNC-STATES-${name}-POOL`;
}

export function enableDiscovery(name?: string) {
  if (!globalContext) {
    return;
  }

  let libraryPools = getLibraryPools();
  let poolName = getPoolName(name || "default");
  let maybePool = libraryPools[poolName];

  if (!maybePool) {
    if (__DEV__) {
      console.error(`enableDiscovery called on a non existent pool ${name}`);
    }
    return;
  }

  globalContext[`${LIBRARY_POOLS_PROPERTY}_${poolName}`] = maybePool;
}

export let didSetDefaultPool;



export function setDefaultPool(name: string): Promise<void> {
  if (!name) {
    throw new Error("name is required");
  }
  return new Promise((resolve, reject) => {
    if (didSetDefaultPool) {
      throw new Error("setDefaultPool can only be called once for now")
    }
    if (!globalContext) {
      reject();
    }
    let poolSharedName = `${LIBRARY_POOLS_PROPERTY}_${getPoolName(name)}`;
    let maybePool = globalContext[poolSharedName] as PoolInterface;
    if (!maybePool) {
      reject(`No shared pool with name ${name}`);
    }
    poolInUse = maybePool;
    didSetDefaultPool = true;
    resolve();
  });
}

export function getOrCreatePool(name?: string): PoolInterface {
  if (!name) {
    return poolInUse;
  }

  let poolName = getPoolName(name);
  let libraryPools = getLibraryPools();
  let candidate = libraryPools[poolName];

  if (!candidate) {
    let newPool = createPool(name);
    libraryPools[newPool.name] = newPool;
    return newPool;
  }

  return candidate;
}

export function warnAboutAlreadyExistingSourceWithSameKey(key) {
  if (!didWarnAboutExistingInstanceRecreation) {
    console.error(`
    [WARNING] - A previous instance with key ${key} exists,
    calling 'createSource' with the same key will result in 
    patching the producer and the config.
    `);
    didWarnAboutExistingInstanceRecreation = true;
  }
}
