import * as Flags from "./state-hook/StateHookFlags";

import {
  AbortedState,
  CacheConfig,
  CachedState,
  ErrorState,
  HydrationData,
  InitialState,
  PendingState,
  ProducerProps,
  ProducerSavedProps,
  State,
  StateBuilderInterface,
  SuccessState
} from "./types";
import {Status} from "./enums";

declare global {
  interface Window {
    __ASYNC_STATES_HYDRATION_DATA__?: any;
  }
}

export let __DEV__ = process.env.NODE_ENV !== "production";
export let sourceSymbol: symbol = Symbol();
export let maybeWindow = typeof window !== "undefined" ? window : undefined;
export let isServer = typeof maybeWindow === "undefined" ||
  !maybeWindow.document ||
  !maybeWindow.document.createElement;
export let now = () => Date.now();
export let freeze = Object.freeze;
export let isArray = Array.isArray;
export let emptyArray = [];
export let asyncStatesKey = freeze(Object.create(null));

export function hash<T, E, R>(
  args?: any[],
  payload?: { [id: string]: any } | null,
  config?: CacheConfig<T, E, R>
): string {
  const hashFn = config?.hash || defaultHash;
  return hashFn(args, payload);
}

export function defaultHash(
  args?: any[], payload?: { [id: string]: any } | null): string {
  return JSON.stringify({args, payload});
}

export function didNotExpire<T, E, R>(cachedState: CachedState<T, E, R>) {
  const {addedAt, deadline} = cachedState;

  return addedAt + deadline >= now();
}

export function isSource(possiblySource: any) {
  return possiblySource && possiblySource[sourceSymbol] === true;
}

export function shallowClone(
  source1,
  source2?
) {
  return Object.assign({}, source1, source2);
}

export function isPromise(candidate) {
  return !!candidate && isFunction(candidate.then);
}

export function isGenerator(candidate) {
  return !!candidate && isFunction(candidate.next) && isFunction(candidate.throw);
}

export function isFunction(fn) {
  return typeof fn === "function";
}

export let {initial, success, pending, error, aborted} = Status;

function state<T>(status: Status.initial, data: T | undefined, props: ProducerSavedProps<T> | null, timestamp: number): InitialState<T>
function state<T>(status: Status.pending, data: null, props: ProducerSavedProps<T> | null, timestamp: number): PendingState<T>
function state<T>(status: Status.success, data: T, props: ProducerSavedProps<T> | null, timestamp: number): SuccessState<T>
function state<T, E, R>(status: Status.aborted, data: R, props: ProducerSavedProps<T> | null, timestamp: number): AbortedState<T, E, R>
function state<T, E>(status: Status.error, data: E, props: ProducerSavedProps<T> | null, timestamp: number): ErrorState<T, E>
function state<T, E, R>(status, data, props: ProducerSavedProps<T> | null, timestamp: number): State<T, E, R> {
  // @ts-ignore
  return {
    status,
    data,
    props,
    timestamp,
  };
}
export const StateBuilder = freeze({
  initial<T>(initialValue): InitialState<T> {
    return freeze(state<T>(initial, initialValue, null, now()));
  },
  error<T, E = any>(data, props): ErrorState<T, E> {
    return freeze(state<T, E>(error, data, props, now()));
  },
  success<T>(data, props): SuccessState<T> {
    return freeze(state<T>(success, data, props, now()));
  },
  pending<T>(props): PendingState<T> {
    return freeze(state<T>(pending, null, props, now()));
  },
  aborted<T, E = any, R = any>(reason, props): AbortedState<T, E, R> {
    return freeze(state<T, E, R>(Status.aborted, reason, props, now()));
  }
}) as StateBuilderInterface;

export function cloneProducerProps<T, E, R>(props: ProducerProps<T, E, R>): ProducerSavedProps<T> {
  const output: ProducerSavedProps<T> = {
    lastSuccess: shallowClone(props.lastSuccess),
    payload: props.payload,
    args: props.args,
  };

  delete output.lastSuccess!.props;

  return output;
}

const defaultAnonymousPrefix = "async-state-";
export const nextKey: () => string = (function autoKey() {
  let key = 0;
  return function incrementAndGet() {
    key += 1;
    return `${defaultAnonymousPrefix}${key}`;
  }
}());


export function attemptHydratedState<T, E, R>(
  poolName: string, key: string): HydrationData<T, E, R> | null {
  // do not attempt hydration outside server
  if (isServer) {
    return null;
  }
  if (!maybeWindow || !maybeWindow.__ASYNC_STATES_HYDRATION_DATA__) {
    return null;
  }

  let savedHydrationData = maybeWindow.__ASYNC_STATES_HYDRATION_DATA__;
  let name = `${poolName}__INSTANCE__${key}`;
  let maybeState = savedHydrationData[name];

  if (!maybeState) {
    return null;
  }

  delete savedHydrationData[name];
  if (Object.keys(savedHydrationData).length === 0) {
    delete maybeWindow.__ASYNC_STATES_HYDRATION_DATA__;
  }

  return maybeState as HydrationData<T, E, R>;
}

export function mapFlags(flags: number) {
  if (!__DEV__) {
    return emptyArray;
  }
  if (flags === null || flags === undefined) {
    return emptyArray;
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
