// @ts-ignore
export const timeout = <T = any>(delay, ...value) => () => new Promise<T>(res => setTimeout(() => res(...value), delay));

export const rejectionTimeout = (delay, ...value) => () => new Promise((res, rej) => setTimeout(() => {
  rej(...value);
}, delay));

export function spyOnConsole(consoleMethod) {
  return jest.spyOn(console, consoleMethod)
}
