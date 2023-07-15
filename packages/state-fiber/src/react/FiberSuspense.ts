let suspendingPromises = new WeakSet<Promise<any>>();
export function registerSuspendingPromise(promise: Promise<any>) {
	suspendingPromises.add(promise);
}
export function resolveSuspendingPromise(promise: Promise<any>) {
	suspendingPromises.delete(promise);
}
export function isSuspending(promise: Promise<any>) {
	return suspendingPromises.has(promise);
}
