import {
  CachedState,
  ProducerProps,
  ProducerSavedProps
} from "./types";
import {freeze, now} from "./helpers/corejs";

declare global {
  interface Window {
    __ASYNC_STATES_HYDRATION_DATA__?: any;
  }
}

export let __DEV__ = process.env.NODE_ENV !== "production";
export let maybeWindow = typeof window !== "undefined" ? window : undefined;
export let isServer = typeof maybeWindow === "undefined" ||
  !maybeWindow.document ||
  !maybeWindow.document.createElement;
export let emptyArray = [];
export let asyncStatesKey = freeze(Object.create(null));

export function defaultHash<A extends unknown[]>(
  args: A | undefined,
  payload: Record<string, unknown> | null | undefined
): string {
  return JSON.stringify({args, payload});
}

export function didNotExpire<T, E, R, A extends unknown[]>(cachedState: CachedState<T, E, R, A>) {
  const {addedAt, deadline} = cachedState;

  return addedAt + deadline >= now();
}

export function isPromise(candidate) {
  return !!candidate && isFunction(candidate.then);
}

export function isGenerator<T = unknown>(candidate): candidate is Generator<any, T, any> {
  return !!candidate && isFunction(candidate.next) && isFunction(candidate.throw);
}

export function isFunction(fn): fn is Function {
  return typeof fn === "function";
}

export function cloneProducerProps<T, E, R, A extends unknown[]>(props: Partial<ProducerProps<T, E, R, A>>): ProducerSavedProps<T, A> {
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
  }
}());
