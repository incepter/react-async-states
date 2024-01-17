import { freeze } from "../helpers/core";
import { LibraryContext, StateInterface } from "../types";
import { __DEV__ } from "../utils";
import devtools from "../devtools/Devtools";

let contexts = new WeakMap<Object, LibraryContext>();
let globalContextKey = freeze({});
let globalContext = createContext(globalContextKey);

function createNewContext(arg: any): LibraryContext {
  let instances = new Map<string, StateInterface<any, any, any>>();

  let createdContext = freeze({
    ctx: arg,
    payload: {},

    get(key: string) {
      return instances.get(key);
    },
    remove(key: string): boolean {
      return instances.delete(key);
    },
    set(key: string, inst: StateInterface<any, any, any>) {
      instances.set(key, inst);
    },
    getAll() {
      return [...instances.values()];
    },
    terminate() {
      instances = new Map<string, StateInterface<any, any, any>>();
    },
  });
  if (__DEV__) devtools.captureContext(createdContext);
  return createdContext;
}

export function createContext(arg: any): LibraryContext {
  // null means the static global context
  if (arg === null) {
    return globalContext;
  }

  if (typeof arg !== "object") {
    throw new Error(
      "createContext requires an object. Received " + String(typeof arg)
    );
  }

  let existingContext = contexts.get(arg);
  if (existingContext) {
    return existingContext;
  }

  let newContext = createNewContext(arg);
  contexts.set(arg, newContext);

  return newContext;
}

export function requestContext(arg: any): LibraryContext {
  if (arg === null) {
    return globalContext;
  }

  let context = contexts.get(arg);

  if (!context) {
    throw new Error(
      "Context not found. Please make sure to call createContext before " +
        "requestContext."
    );
  }

  return context;
}

export function terminateContext(arg: any): boolean {
  if (!arg) {
    return false;
  }

  let desiredContext = contexts.get(arg);
  if (!desiredContext) {
    return false;
  }

  // this will un-reference all instances from the context
  desiredContext.terminate();
  if (__DEV__) devtools.releaseContext(desiredContext);
  return contexts.delete(arg);
}

export function getContext(arg: any): LibraryContext | undefined {
  if (arg === null) {
    return globalContext;
  }

  return contexts.get(arg);
}
