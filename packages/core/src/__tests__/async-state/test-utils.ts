export const timeout =
  <TData = any>(delay, ...value) =>
  () =>
    // @ts-ignore
    new Promise<TData>((res) => setTimeout(() => res(...value), delay));

export const rejectionTimeout =
  (delay, ...value) =>
  () =>
    new Promise((res, rej) =>
      setTimeout(() => {
        rej(...value);
      }, delay)
    );
