import { ASYNC_STATUS } from "../utils";

export const AsyncStateBuilder = Object.freeze({
  initial: Object.freeze({ status: ASYNC_STATUS.initial, data: null, args: null }),
  error: (data, args) => Object.freeze({ status: ASYNC_STATUS.error, data, args }),
  success: (data, args) => Object.freeze({ status: ASYNC_STATUS.success, data, args }),
  loading: args => Object.freeze({ status: ASYNC_STATUS.loading, data: null, args }),
  aborted: (reason, args) => Object.freeze({ status: ASYNC_STATUS.aborted, data: reason, args }),
});
