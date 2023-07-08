export function noop() {}

export function isPromise<T = any>(candidate): candidate is Promise<T> {
	return !!candidate && typeof candidate.then === "function";
}

export const emptyArray = [];
