import {
	FiberPromise,
	FulfilledPromise,
	IStateFiber,
	RejectedPromise,
	RunTask,
	SavedProps,
	State,
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
		dispatchSetData(fiber, task.result as T, null);
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
					let { args, payload } = task;
					if (fiber.pending === task) {
						fiber.task = task;
						fiber.pending = null;
					}
					dispatchSetData(fiber, value, { args, payload });
				}
			},
			(error: R) => {
				untrackedPromise.status = "rejected";
				(untrackedPromise as RejectedPromise<R>).reason = error;

				let { args, payload } = task;
				if (fiber.pending === task) {
					fiber.task = task;
					fiber.pending = null;
				}
				if (!indicators.aborted) {
					dispatchSetError(fiber, error, { args, payload });
				}
			}
		);
	}
	if (!indicators.aborted && promise.status === "pending") {
		fiber.pending = task;
		dispatchFiberPendingEvent(fiber, task);
	}
}

export function dispatchNotification<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>
) {
	for (let listener of fiber.listeners.values()) {
		listener.callback();
	}
}

export function dispatchNotificationExceptFor<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	cause: any
) {
	for (let listener of fiber.listeners.values()) {
		if (cause !== listener.update) {
			listener.callback();
		}
	}
}

let notifyOnPending = true;
export function togglePendingNotification(nextValue: boolean) {
	let previousValue = notifyOnPending;
	notifyOnPending = nextValue;
	return previousValue;
}
export function dispatchFiberPendingEvent<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	task: RunTask<T, A, R, P> // unused
) {
	fiber.version += 1;
	if (notifyOnPending) {
		dispatchNotification(fiber);
	}
}

export function dispatchSetData<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	data: T,
	props: SavedProps<A, P> | null
) {
	if (fiber.pending) {
		cleanFiberTask(fiber.pending);
	}

	// null means setData was called directly, not when ran
	let savedProps =
		props !== null
			? props
			: savedPropsFromDataUpdate<A, P>(data, fiber.payload);

	fiber.state = {
		data,
		props: savedProps,
		status: "success",
		timestamp: Date.now(),
	};

	fiber.version += 1;

	dispatchNotification(fiber);
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

export function dispatchSetError<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	error: R,
	props: SavedProps<A, P> | null
) {
	if (fiber.pending) {
		cleanFiberTask(fiber.pending);
	}

	// null means setData was called directly, not when ran
	let savedProps =
		props !== null
			? props
			: savedPropsFromDataUpdate<A, P>(error, fiber.payload);

	fiber.state = {
		error,
		status: "error",
		props: savedProps,
		timestamp: Date.now(),
	};
	fiber.version += 1;
	dispatchNotification(fiber);
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
	dispatchNotification(fiber);
}
