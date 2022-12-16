// @ts-ignore
export const timeout = (delay, ...value) => () => new Promise(res => setTimeout(() => res(...value), delay));

export const rejectionTimeout = (delay, ...value) => () => new Promise((res, rej) => setTimeout(() => {
  rej(...value);
}, delay));
