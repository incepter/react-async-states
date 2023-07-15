import {
	ErrorState,
	FiberPromise,
	FulfilledPromise,
	InitialState,
	IStateFiber,
	RejectedPromise,
	RunTask,
	SavedProps,
	State,
	SuccessState,
} from "./_types";
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
	} else {
		fiber.task = task;
		dispatchFiberDataEvent(fiber, task.result as T);
	}
}

function trackPendingFiberPromise<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	task: RunTask<T, A, R, P>
) {
	let indicators = task.indicators;
	// this is the pending path, the task is always pending
	let promise = task.result as FiberPromise<T, R>;
	task.promise = promise;

	// this means this promise has never been tracked or used by the lib or react
	if (!promise.status) {
		// todo: move this logic to a new function
		let untrackedPromise = promise as FiberPromise<T, R>;

		untrackedPromise.status = "pending";
		untrackedPromise.then(
			(value: T) => {
				untrackedPromise.status = "fulfilled";
				(untrackedPromise as FulfilledPromise<T>).value = value;

				if (!indicators.aborted) {
					// todo: all dispatch from here should include the 'task'
					//       so we are aware of callbacks and other stuff
					dispatchFiberDataEvent(fiber, value);
				}
				if (fiber.pending === task) {
					fiber.pending = null;
				}
			},
			(error: R) => {
				untrackedPromise.status = "rejected";
				(untrackedPromise as RejectedPromise<R>).reason = error;

				if (!indicators.aborted) {
					dispatchFiberErrorEvent(fiber, error);
				}
				if (fiber.pending === task) {
					fiber.pending = null;
				}
			}
		);
	}
	if (!indicators.aborted && promise.status === "pending") {
		fiber.pending = task;
		dispatchFiberPendingEvent(fiber, task);
	}
}

function dispatchFiberNotificationEvent<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>
) {
	for (let listener of fiber.listeners.values()) {
		listener.callback();
	}
}

export function dispatchFiberPendingEvent<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	task: RunTask<T, A, R, P>
) {
	let previousSettledState:
		| InitialState<T>
		| ErrorState<A, R, P>
		| SuccessState<T, A, P> = resolveLatestState(fiber, fiber.state);

	fiber.version += 1;
	fiber.state = {
		status: "pending",
		timestamp: Date.now(),
		prev: previousSettledState,
		props: { payload: task.payload, args: task.args },
	};

	dispatchFiberNotificationEvent(fiber);
}

function resolveLatestState<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	currentState: IStateFiber<T, A, R, P>["state"]
) {
	if (currentState.status === "initial") {
		return currentState;
	}
	if (currentState.status === "success") {
		return currentState;
	}
	if (currentState.status === "error") {
		return currentState;
	}
	return resolveLatestState(fiber, currentState.prev);
}

export function dispatchFiberDataEvent<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	data: T
) {
	if (fiber.pending) {
		cleanFiberTask(fiber.pending);
	}
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
	if (fiber.pending) {
		cleanFiberTask(fiber.pending);
	}
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
	if (fiber.pending) {
		cleanFiberTask(fiber.pending);
	}
	fiber.state = state;
	fiber.version += 1;
	dispatchFiberNotificationEvent(fiber);
}
