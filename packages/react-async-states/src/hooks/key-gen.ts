const defaultAnonymousPrefix = "anonymous-async-state-";
export const nextKey: () => string = (function autoKey() {
  let key = 0;
  return function incrementAndGet() {
    key += 1;
    return `${defaultAnonymousPrefix}${key}`;
  }
}());
