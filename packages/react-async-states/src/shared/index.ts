import * as Flags from "../StateHookFlags";

export const __DEV__ = process.env.NODE_ENV !== "production";

// avoid spreading penalty!
export function shallowClone(
  source1,
  source2?
) {
  return Object.assign({}, source1, source2);
}

export function isFunction(fn) {
  return typeof fn === "function";
}

export function humanizeDevFlags(flags: number) {
  if (flags === null || flags === undefined) {
    return [];
  }
  let out: string[] = [];
  Object
    .entries(Flags)
    .forEach(([name, value]) => {
      if (value & flags) {
        out.push(name);
      }
    });
  return out;
}

//region useAsyncState value construction
export function noop(): undefined {
  // that's a noop fn
  return undefined;
}

export const emptyArray = [];
