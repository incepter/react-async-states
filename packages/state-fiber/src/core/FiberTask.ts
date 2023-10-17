import { ICallbacks, RunTask } from "./_types";
import { noop } from "../utils";

export function createTask<T, A extends unknown[], R, P>(
	args: A,
	payload: P,
	callbacks: ICallbacks<T, R>
): RunTask<T, A, R, P> {
	const controller = new AbortController();
	const onAbort = (cb: () => void) =>
		controller.signal.addEventListener("abort", cb);

	return {
		args,
		payload,
		callbacks,

		onAbort,
		controller,
		clean: noop,
		result: null,
		promise: null,

		at: Date.now(),
		indicators: {
			aborted: false,
			cleared: false,
		},
	};
}

export function cleanFiberTask<T, A extends unknown[], R, P>(
	task: RunTask<T, A, R, P>
) {
	task.controller.abort();
	task.indicators.cleared = true;
	task.indicators.aborted = true;
}
