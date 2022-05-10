import {
  ProducerConfig,
  ProducerProps,
  ProducerSavedProps
} from "../react-async-states/src/async-state";
import {PartialUseAsyncStateConfiguration} from "react-async-states/src/types.internal";

export const __DEV__ = process.env.NODE_ENV !== "production";

export const EMPTY_ARRAY = Object.freeze([]);
export const EMPTY_OBJECT = Object.freeze({});

// avoid spreading penalty!
export function shallowClone(
  source1,
  source2?
) {
  return Object.assign({}, source1, source2);
}

export const AsyncStateStatus = {
  error: "error",
  pending: "pending",
  success: "success",
  aborted: "aborted",
  initial: "initial",
};

export function asyncify(fn) {
  return function caller(...args) {
    return Promise.resolve().then(function callFn() {
      invokeIfPresent(fn, ...args);
    });
  }
}

export function invokeIfPresent(
  fn,
  ...args
) {
  if (isFn(fn)) {
    return fn(...args);
  }
  return undefined;
}

export function shallowEqual<T>(
  prev: T,
  next
): boolean {
  return prev === next;
}

export function identity(...args: any[]): any {
  if (!args || !args.length) {
    return undefined;
  }
  return args.length === 1 ? args[0] : args;
}

export function oneObjectIdentity<T>(obj: T): T {
  return obj;
}

export function cloneProducerProps<T>(props: ProducerProps<T>): ProducerSavedProps<T> {
  const output: ProducerSavedProps<T> = {};

  if (props.lastSuccess !== undefined) {
    output.lastSuccess = shallowClone(props.lastSuccess);
    // @ts-ignore
    // todo: whaaat
    delete output.lastSuccess.props;
  }

  output.payload = shallowClone(props.payload);

  if (Array.isArray(props.args) && props.args.length) {
    output.args = [...props.args];
  } else {
    output.args = emptyArray;
  }

  return output;
}

const emptyArray = [];

export function readProducerConfigFromSubscriptionConfig<T>(
  configuration: PartialUseAsyncStateConfiguration<T, any>
): ProducerConfig<T> {
  return {
    initialValue: configuration.initialValue,

    cacheConfig: configuration.cacheConfig,

    runEffect: configuration.runEffect,
    runEffectDurationMs: configuration.runEffectDurationMs,
  };
}

export function readProducerConfigFromProducerConfig<T>(
  configuration?: ProducerConfig<T>
): ProducerConfig<T> {
  if (!configuration) {
    return EMPTY_OBJECT;
  }
  return {
    initialValue: configuration.initialValue,

    cacheConfig: configuration.cacheConfig,

    runEffect: configuration.runEffect,
    runEffectDurationMs: configuration.runEffectDurationMs,

    runOnCreation: configuration.runOnCreation,
    skipPendingDelayMs: configuration.skipPendingDelayMs,
  };
}

export function numberOrZero(maybeNumber) {
  return Number(maybeNumber) || 0;
}

export function warning(...args) {
  console.error(...args);
}

export function isFn(fn: Function | any): boolean {
  return typeof fn === "function";
}

export function isPromise(candidate) {
  return !!candidate && isFn(candidate.then);
}

export function isGenerator(candidate) {
  return !!candidate && isFn(candidate.next) && isFn(candidate.throw);
}
