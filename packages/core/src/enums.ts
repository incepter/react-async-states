export type RunEffect = "delay" | "debounce" | "throttle";
export type Status = "error" | "pending" | "success" | "aborted" | "initial";

export let error = "error" as const;
export let pending = "pending" as const;
export let success = "success" as const;
export let initial = "initial" as const;
