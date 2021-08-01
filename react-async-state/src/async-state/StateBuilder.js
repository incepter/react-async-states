import { AsyncStateStatus } from "../shared";

export const AsyncStateBuilder = Object.freeze({
  initial: Object.freeze({ status: AsyncStateStatus.initial, data: null, args: null }),
  error: (data, args) => Object.freeze({ status: AsyncStateStatus.error, data, args }),
  success: (data, args) => Object.freeze({ status: AsyncStateStatus.success, data, args }),
  loading: args => Object.freeze({ status: AsyncStateStatus.loading, data: null, args }),
  aborted: (reason, args) => Object.freeze({ status: AsyncStateStatus.aborted, data: reason, args }),
});
