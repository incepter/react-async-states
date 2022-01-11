import {__DEV__} from "shared";
import {
  AsyncStateInterface,
  AsyncStateSource,
  AsyncStateStateBuilderInterface,
  AsyncStateStatus,
  ProducerSavedProps,
  State
} from "./types";

export function warnDevAboutAsyncStateKey(key) {
  if (__DEV__) {
    if (typeof key !== "string") {
      console.error(`Warning: Got a key for asyncState '${String(key)}' of type='${typeof key}'. Please consider using strings, especially if it will be forked.`)
    }
  }
}

export function warnDevAboutUndefinedPromise(
  key,
  fn
) {
  if (__DEV__) {
    if (typeof fn !== "function") {
      console.error(`Warning: The producer of asyncState with key='${key}' is not a function, received type '${typeof fn}'. This assumes that you are using it as a basic state that will be replaced by replaceState each time.`)
    }
  }
}

function Secret() {
  const vault = new WeakMap();
  return function Source() {
    if (arguments.length === 1) {
      return vault.get(arguments[0]);
    }
    if (arguments.length === 2) {
      vault.set(arguments[0], arguments[1]);
    }
  };
}

function objectWithHiddenProperty(
  key: Object,
  value: AsyncStateInterface<any>
) {
  // @ts-ignore
  let output = new (Secret())();
  output.constructor(key, value);

  return output;
}

const asyncStatesKey = Object.freeze(Object.create(null));

export function constructAsyncStateSource<T>(asyncState: AsyncStateInterface<T>): AsyncStateSource<T> {
  return objectWithHiddenProperty(asyncStatesKey, asyncState);
}

export function readAsyncStateFromSource<T>(possiblySource: AsyncStateSource<T>): AsyncStateInterface<T> {
  try {
    return possiblySource.constructor(asyncStatesKey); // async state instance
  } catch (e) {
    const errorString = "You ve passed an incompatible source object. Please make sure to pass the received source object.";
    console.error(errorString);
    throw new Error(errorString);
  }
}

function state<T>(
  status: AsyncStateStatus,
  data: T | any,
  props: ProducerSavedProps<T> | null
): State<T> {
  return Object.freeze({status, data, props});
}

export const AsyncStateStateBuilder = Object.freeze({
  initial: (initialValue) => state(AsyncStateStatus.initial, initialValue, null),
  error: (
    data,
    props
  ) => state(AsyncStateStatus.error, data, props),
  success: (
    data,
    props
  ) => state(AsyncStateStatus.success, data, props),
  pending: props => state(AsyncStateStatus.pending, null, props),
  aborted: (
    reason,
    props
  ) => state(AsyncStateStatus.aborted, reason, props),
}) as AsyncStateStateBuilderInterface;
