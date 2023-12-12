export type RunEffect = "delay" | "debounce" | "throttle";
export type Status = "error" | "pending" | "success" | "aborted" | "initial";

// todo: remove all of these or only use them
export let error = "error" as const;
export let pending = "pending" as const;
export let success = "success" as const;
export let aborted = "aborted" as const;
export let initial = "initial" as const;
