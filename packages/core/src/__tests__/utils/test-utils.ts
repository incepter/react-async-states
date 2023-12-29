export function timeoutToUse<TData>(
  delay,
  resolveValue: TData,
  setId
): Promise<TData> {
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
