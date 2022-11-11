export const __DEV__ = process.env.NODE_ENV !== "production";

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

export function isPromise(candidate) {
  return !!candidate &&
    typeof candidate.then === "function";
}

export function isGenerator(candidate) {
  return !!candidate &&
    typeof candidate.next === "function" &&
    typeof candidate.throw === "function";
}
