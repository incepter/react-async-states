import {
  ProducerProps,
  ProducerSavedProps
} from "react-async-states/src";

export const __DEV__ = process.env.NODE_ENV !== "production";

export const EMPTY_OBJECT = Object.freeze({});

// avoid spreading penalty!
export function shallowClone(
  source1,
  source2?
) {
  return Object.assign({}, source1, source2);
}

export function shallowEqual<T>(
  prev: T,
  next
): boolean {
  return prev === next;
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

export function isPromise(candidate) {
  return !!candidate &&
    typeof candidate.then === "function";
}

export function isGenerator(candidate) {
  return !!candidate &&
    typeof candidate.next === "function" &&
    typeof candidate.throw === "function";
}
