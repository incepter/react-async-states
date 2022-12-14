import {CacheConfig, CachedState} from "./index";


export const asyncStatesKey = Object.freeze(Object.create(null));

export function hash<T, E, R>(
  args?: any[],
  payload?: {[id: string]: any} | null,
  config?: CacheConfig<T, E, R>): string {
  const hashFn = config?.hash || defaultHash;
  return hashFn(args, payload);
}

export function defaultHash(args?: any[], payload?: {[id: string]: any} | null): string {
  return JSON.stringify({args, payload});
}

export function didNotExpire<T, E, R>(cachedState: CachedState<T, E, R>) {
  const {addedAt, deadline} = cachedState;

  return addedAt + deadline >= Date.now();
}

export const sourceIsSourceSymbol: symbol = Symbol();

export function isSource(possiblySource: any) {
  return possiblySource && possiblySource[sourceIsSourceSymbol] === true;
}

