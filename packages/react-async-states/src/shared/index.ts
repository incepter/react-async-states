import * as Flags from "../state-hook/StateHookFlags";

export const __DEV__ = process.env.NODE_ENV !== "production";

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

export const emptyArray = [];

export let isArray = Array.isArray;
