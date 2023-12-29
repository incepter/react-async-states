export function timeoutToUse<T>(delay, resolveValue: T, setId): Promise<T> {
  return new Promise((resolve) => {
    const id = setTimeout(() => {
      resolve(resolveValue);
    }, delay);
    setId(id);
  });
}

export function rejectionTimeoutToUse(delay, resolveValue, setId) {
  return new Promise((resolve) => {
    const id = setTimeout(() => resolve(resolveValue), delay);
    setId(id);
  });
}

export function flushPromises() {
  return new Promise(jest.requireActual("timers").setImmediate);
}
