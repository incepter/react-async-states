export const __DEV__ = process.env.NODE_ENV !== "production";

export function isFunction(fn) {
  return typeof fn === "function";
}

export const emptyArray = [];

export function didDepsChange(deps: any[], deps2: any[]) {
  if (deps.length !== deps2.length) {
    return true;
  }
  for (let i = 0, {length} = deps; i < length; i += 1) {
    if (!Object.is(deps[i], deps2[i])) {
      return true;
    }
  }
  return false;
}

export let assign = Object.assign;
export let freeze = Object.freeze;
export let isArray = Array.isArray;
