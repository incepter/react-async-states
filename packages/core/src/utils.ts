import { ProducerProps, ProducerSavedProps } from "./types";

export let __DEV__ = process.env.NODE_ENV !== "production";
export let maybeWindow = typeof window !== "undefined" ? window : undefined;
export let isServer =
  typeof maybeWindow === "undefined" || "Deno" in maybeWindow;

export let emptyArray = [];

export function defaultHash<TArgs extends unknown[]>(
  args: TArgs | undefined,
  payload: Record<string, unknown> | null | undefined
): string {
  return JSON.stringify({ args, payload });
}

export function isPromise(candidate: any) {
  return !!candidate && isFunction(candidate.then);
}

export function isGenerator<TData = unknown>(
  candidate: any
): candidate is Generator<any, TData, any> {
  return (
    !!candidate && isFunction(candidate.next) && isFunction(candidate.throw)
  );
}

export function isFunction(fn: any): fn is Function {
  return typeof fn === "function";
}

export function cloneProducerProps<TData, TArgs extends unknown[], E>(
  props: ProducerProps<TData, TArgs, E>
): ProducerSavedProps<TData, TArgs> {
  return {
    args: props.args,
    payload: props.payload,
  };
}

const defaultAnonymousPrefix = "async-state-";
export const nextKey: () => string = (function autoKey() {
  let key = 0;
  return function incrementAndGet() {
    key += 1;
    return `${defaultAnonymousPrefix}${key}`;
  };
})();
