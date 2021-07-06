export const timeout = (delay, ...value) => () => new Promise(res => setTimeout(() => res(...value), delay));
