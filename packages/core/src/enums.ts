export enum Status {
  error = "error",
  pending = "pending",
  success = "success",
  aborted = "aborted",
  initial = "initial",
}

export enum RunEffect {
  delay = "delay",
  debounce = "debounce",
  throttle = "throttle",
}

export let {initial, success, pending, error, aborted} = Status;
