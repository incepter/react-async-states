export const __DEV__ = process.env.NODE_ENV !== "production";

export function noop() {}

export function isPromise<T = any>(candidate): candidate is Promise<T> {
	return !!candidate && typeof candidate.then === "function";
}

export const emptyArray = [];

export function resolveComponentName() {
	const stackTrace = new Error().stack;
	if (!stackTrace) {
		return undefined;
	}

	const regex = new RegExp(/at.(\w+).*$/, "gm");
	let match = regex.exec(stackTrace);

	let i = 0;
	while (i < 3 && match) {
		match = regex.exec(stackTrace);

		i += 1;
	}

	return match?.[1];
}

export function didDepsChange(deps: any[], deps2: any[]) {
	if (deps.length !== deps2.length) {
		return true;
	}
	for (let i = 0, { length } = deps; i < length; i += 1) {
		if (!Object.is(deps[i], deps2[i])) {
			return true;
		}
	}
	return false;
}

let renders = 0;
export function guardAgainstInfiniteLoop() {
	if (++renders > 10) {
		throw new Error("Stop");
	}
}
