import { ProducerProps, ProducerSavedProps } from "./types";

export let __DEV__ = process.env.NODE_ENV !== "production";
export let maybeWindow = typeof window !== "undefined" ? window : undefined;
export let isServer =
	typeof maybeWindow === "undefined" ||
	!maybeWindow.document ||
	!maybeWindow.document.createElement;
export let emptyArray = [];

export function defaultHash<A extends unknown[]>(
	args: A | undefined,
	payload: Record<string, unknown> | null | undefined
): string {
	return JSON.stringify({ args, payload });
}

export function isPromise(candidate) {
	return !!candidate && isFunction(candidate.then);
}

export function isGenerator<T = unknown>(
	candidate
): candidate is Generator<any, T, any> {
	return (
		!!candidate && isFunction(candidate.next) && isFunction(candidate.throw)
	);
}

export function isFunction(fn): fn is Function {
	return typeof fn === "function";
}

export function cloneProducerProps<T, E, A extends unknown[]>(
	props: Partial<ProducerProps<T, E, A>>
): ProducerSavedProps<T, A> {
	return {
		args: props.args,
		payload: props.payload,
	};
}

const defaultAnonymousPrefix = "async-state-";
export const nextKey: () => string = (function autoKey() {
	let key = 0;
	return function incrementAndGet() {
		key += 1;
		return `${defaultAnonymousPrefix}${key}`;
	};
})();
