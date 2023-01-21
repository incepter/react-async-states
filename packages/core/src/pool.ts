import {
  AbortFn,
  AsyncStatePools,
  LibraryPoolsContext,
  PoolInterface,
  StateInterface,
  WatchCallback
} from "./types";
import {version} from "../package.json";
import {__DEV__, isServer, maybeWindow} from "./utils";


let defaultPoolName = "default";
let globalContext = maybeWindow || globalThis || null;
let didWarnAboutExistingInstanceRecreation = false;

function createPool(name: string, context: LibraryPoolsContext): PoolInterface {
  let meter = 0;
  let watchers = {};
  let listeners = {};
  let instances = new Map<string, StateInterface<any>>();
  return {
    context,
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

export function createContext(ctx: any): LibraryPoolsContext {
  if (ctx !== null) {
    let maybeContext = poolsContexts.get(ctx);

    if (maybeContext) {
      return maybeContext;
    }
  }
  if (typeof ctx !== "object") {
    throw new Error("createContext requires an object");
  }

  let didSetDefaultPool;
  let ownLibraryPools = {} as AsyncStatePools;
  let LIBRARY_POOLS_PROPERTY = "__ASYNC_STATES_POOLS__";
  // @ts-ignore
  let ownPool: PoolInterface = createPool(defaultPoolName, null); // will be assigned in a few
  let poolInUse: PoolInterface = ownPool;
  ownLibraryPools[ownPool.name] = ownPool;
  function getOrCreatePool(name?: string): PoolInterface {
    if (!name) {
      return poolInUse;
    }

    let poolName = getPoolName(name);
    let libraryPools = getLibraryPools();
    let candidate = libraryPools[poolName];

    if (!candidate) {
      let newPool = createPool(name, poolsContext);
      libraryPools[newPool.name] = newPool;
      return newPool;
    }

    return candidate;
  }
  function getLibraryPools(): AsyncStatePools {
    return ownLibraryPools;
  }
  function enableDiscovery(name?: string) {
    if (!globalContext) {
      return;
    }

    let libraryPools = getLibraryPools();
    let poolName = getPoolName(name || defaultPoolName);
    let maybePool = libraryPools[poolName];

    if (!maybePool) {
      if (__DEV__) {
        console.error(`enableDiscovery called on a non existent pool ${name}`);
      }
      return;
    }

    globalContext[`${LIBRARY_POOLS_PROPERTY}_${poolName}`] = maybePool;
  }
  function setDefaultPool(name: string): Promise<void> {
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

  let poolsContext: LibraryPoolsContext = {
    poolInUse,
    context: ctx, // assigned here
    setDefaultPool,
    getOrCreatePool,
    enableDiscovery,
    pools: ownLibraryPools,
  };

  ownPool.context = poolsContext; // here!

  if (ctx !== null && typeof ctx === "object") {
    poolsContexts.set(ctx, poolsContext);
  }

  return poolsContext;
}

let poolsContexts = new WeakMap<any, LibraryPoolsContext>;
let DEFAULT_POOL_CONTEXT = createContext(null);

export function getContext(ctx: any): LibraryPoolsContext | undefined {
  if (ctx === null) {
    return DEFAULT_POOL_CONTEXT;
  }
  return poolsContexts.get(ctx);
}

export function terminateContext(ctx: any): boolean {
  if (!ctx) {
    return false;
  }

  return poolsContexts.delete(ctx);
}

export function requestContext(context: any): LibraryPoolsContext {
  if (!context && !isServer) {
    return DEFAULT_POOL_CONTEXT;
  }

  let executionContext = poolsContexts.get(context);
  if (!executionContext && isServer) {
    if (__DEV__) {
      console.error(`
      In the server, and in order to mimic the browser behavior
      for having a single execution context per window. You should create
      all your state instances in the context of a Request.
      
      This would avoid any state being leaked between multiple users,
      and enforces certain thread safety when using the library.
      
      To do so, pass the request object as context configuration to any of the
      library APIs.
      
      When using <Hydration request={request} />, hooks inside will automatically
      use it as a context to perform isolation. So it is important to be at the
      top level of your App.
      `);
    }
    throw new Error("You should always provide an execution context in the server");
  }
  if (!executionContext) {
    if (__DEV__) {
      console.error(`
      The following context was not found after being requested.
      happens either if:
      - You called terminateContext(context) and it was detached.
      - You tried to use a context without using createContext(context).
      `, context);
    }
    throw new Error("No execution context for context " + context);
  }
  return executionContext;
}
