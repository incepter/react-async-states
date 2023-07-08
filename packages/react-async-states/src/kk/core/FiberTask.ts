import { ICallbacks, RunTask } from "./_types";
import { noop } from "../utils";

export function createTask<T, A extends unknown[], R, P>(
	args: A,
	payload: P,
	callbacks: ICallbacks<T, R>
): RunTask<T, A, R, P> {
	const controller = new AbortController();
	const onAbort = (cb) => controller.signal.addEventListener("abort", cb);

	return {
		args,
		payload,
		callbacks,

		onAbort,
		controller,
		clean: noop,
		result: null,

		indicators: {
			aborted: false,
			cleared: false,
		},
	};
}

export function cleanFiberTask(task) {
	task.controller.abort();
	task.clear.forEach((cb) => cb());
}
