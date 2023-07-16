let suspendingPromises = new WeakMap<Promise<any>, Function>();
export function registerSuspendingPromise(promise: Promise<any>, fn) {
	suspendingPromises.set(promise, fn);
}
export function resolveSuspendingPromise(promise: Promise<any>) {
	suspendingPromises.delete(promise);
}
export function isSuspending(promise: Promise<any>) {
	return suspendingPromises.get(promise);
}
