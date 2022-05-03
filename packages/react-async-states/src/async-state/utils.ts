import {
  AsyncStateInterface,
  AsyncStateStatus, CacheConfig, CachedState,
  ProducerSavedProps,
  State,
  StateBuilderInterface
} from "./types";

export const asyncStatesKey = Object.freeze(Object.create(null));

function state<T>(
  status: AsyncStateStatus,
  data: T | any,
  props: ProducerSavedProps<T> | null
): State<T> {
  return Object.freeze({status, data, props, timestamp: Date.now()});
}

export const StateBuilder = Object.freeze({
  initial: (initialValue) => state(AsyncStateStatus.initial, initialValue, null),
  error: (
    data,
    props
  ) => state(AsyncStateStatus.error, data, props),
  success: (
    data,
    props
  ) => state(AsyncStateStatus.success, data, props),
  pending: props => state(AsyncStateStatus.pending, null, props),
  aborted: (
    reason,
    props
  ) => state(AsyncStateStatus.aborted, reason, props),
}) as StateBuilderInterface;

export function hash<T>(
  args?: any[],
  payload?: {[id: string]: any} | null,
  config?: CacheConfig<T>): string {
  const hashFn = config?.hash || defaultHash;
  return hashFn(args, payload);
}

export function defaultHash(args?: any[], payload?: {[id: string]: any} | null): string {
  return JSON.stringify({args, payload});
}

export function didNotExpire<T>(cachedState: CachedState<T>) {
  const {addedAt, deadline} = cachedState;

  return addedAt + deadline >= Date.now();
}
