import { IStateFiber, RunTask, SavedProps, State } from "./_types";
import { cleanFiberTask } from "./FiberTask";
import { isPromise } from "../utils";

export function dispatchFiberAbortEvent<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	task: RunTask<T, A, R, P>
) {
	cleanFiberTask(task);
	task.indicators.aborted = true;

	// remove if it is the current pending
	if (fiber.pending === task) {
		fiber.pending = null;
	}
}

export function dispatchFiberRunEvent<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	task: RunTask<T, A, R, P>
) {
	const result = task.result;
	if (isPromise(result)) {
		trackPendingFiberPromise(fiber, task);
		fiber.pending = task;
	} else {
		fiber.task = task;
		dispatchFiberDataEvent(fiber, task.result as T);
	}
}

function trackPendingFiberPromise<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	task: RunTask<T, A, R, P>
) {
	throw new Error("Not implemented yet");
}

function dispatchFiberNotificationEvent<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>
) {
	for (let listener of fiber.listeners.values()) {
		listener.callback();
	}
}

export function dispatchFiberDataEvent<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	data: T
) {
	fiber.state = {
		data,
		status: "success",
		timestamp: Date.now(),
		props: savedPropsFromDataUpdate<A, P>(data, fiber.payload),
	};
	fiber.version += 1;
	dispatchFiberNotificationEvent(fiber);
}

function savedPropsFromDataUpdate<A extends unknown[], P>(
	data,
	payload: P
): SavedProps<A, P> {
	// sorry..
	return {
		args: [data],
		payload: Object.assign({}, payload),
	} as SavedProps<A, P>;
}

export function dispatchFiberErrorEvent<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	error: R
) {
	fiber.state = {
		error,
		status: "error",
		timestamp: Date.now(),
		props: savedPropsFromDataUpdate<A, P>(error, fiber.payload),
	};
	fiber.version += 1;
	dispatchFiberNotificationEvent(fiber);
}

export function dispatchFiberStateChangeEvent<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	state: State<T, A, R, P>
) {
	fiber.state = state;
	fiber.version += 1;
	dispatchFiberNotificationEvent(fiber);
}
