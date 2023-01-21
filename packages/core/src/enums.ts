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
  takeLast = "takeLast",
  takeLatest = "takeLatest",

  throttle = "throttle",
  takeFirst = "takeFirst",
  takeLeading = "takeLeading",
}
