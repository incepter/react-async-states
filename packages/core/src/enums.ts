export enum Status {
	error = "error",
	pending = "pending",
	success = "success",
	aborted = "aborted",
	initial = "initial",
}

export type RunEffect = "delay" | "debounce" | "throttle";

export let { initial, success, pending, error, aborted } = Status;
