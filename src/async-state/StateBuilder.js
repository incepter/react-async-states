import { AsyncStateStatus } from "../shared";

function state(status, data, args) {
  return Object.freeze({status, data, args});
}

export const AsyncStateStateBuilder = Object.freeze({
  initial: initialValue => state(AsyncStateStatus.initial, initialValue, null),
  error: (data, args) => state(AsyncStateStatus.error, data, args),
  success: (data, args) => state(AsyncStateStatus.success, data, args),
  pending: args => state(AsyncStateStatus.pending, null, args),
  aborted: (reason, args) => state(AsyncStateStatus.aborted, reason, args),
});
