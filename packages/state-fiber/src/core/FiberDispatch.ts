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
					if (
						task === fiber.pending ||
						(fiber.pendingUpdate && task === fiber.pendingUpdate.task)
					) {
						fiber.task = task;
						fiber.pending = null;
					}
					dispatchSetData(fiber, value, { args, payload });
				}
			},
			(error: R) => {
				untrackedPromise.status = "rejected";
				(untrackedPromise as RejectedPromise<R>).reason = error;

				if (!indicators.aborted) {
					if (
						task === fiber.pending ||
						(fiber.pendingUpdate && task === fiber.pendingUpdate.task)
					) {
						fiber.task = task;
						fiber.pending = null;
						let { args, payload } = task;
						dispatchSetError(fiber, error, { args, payload });
					}
				}
			}
		);
	}
	if (!indicators.aborted && promise.status === "pending") {
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
	let pendingUpdate = fiber.pendingUpdate;
	let config = fiber.root.config;

	// you should not be pending for skipPending to work
	// if fast, if you are already giving the pending state to subscribers,
	// no need to wait again, just change the props synchronously
	// this behavior can be tuned via a flag if it turns out to be not viable
	if (
		!fiber.pending &&
		config &&
		config.skipPendingDelayMs &&
		config.skipPendingDelayMs > 0
	) {
		let now = Date.now();
		let pendingUpdateAt = now;
		let delay = config.skipPendingDelayMs;
		// if a previous pending update is scheduled, we should remove the elapsed
		// time from the delay
		if (pendingUpdate) {
			// this cleanup after referencing ensures that pendingUpdate.task
			// gets invalidated so even if it resolves later, it doesn't affect fiber
			cleanPendingFiberUpdate(fiber);
			let prevPendingAt = pendingUpdate.at;
			let elapsedTime = now - prevPendingAt;

			// we deduce here the elapsed time from the previous "scheduled pending"
			delay = delay - elapsedTime;
			pendingUpdateAt = delay < 0 ? now : prevPendingAt;
		}

		let id = setTimeout(() => {
			// do nothing when task was aborted
			// and also only update if status is "still pending"
			// or else, the resolving event is responsible for update and notification
			if (!task.indicators.aborted) {
				 if (task.promise?.status === "pending") {
					 fiber.version += 1;
					 fiber.pending = task;
					 fiber.pendingRun = null;
					 if (notifyOnPending) {
						 dispatchNotification(fiber);
					 }
				 }
			}
		}, delay);
		fiber.pendingUpdate = { id, at: pendingUpdateAt, task };
	} else {
		cleanPendingFiberUpdate(fiber);
		fiber.version += 1;
		fiber.pending = task;
		if (notifyOnPending) {
			dispatchNotification(fiber);
		}
	}
}

export function cleanPendingFiberUpdate(
	fiber: IStateFiber<any, any, any, any>
) {
	let pendingUpdate = fiber.pendingUpdate;
	if (pendingUpdate) {
		cleanFiberTask(pendingUpdate.task);
		clearTimeout(pendingUpdate.id);
		fiber.pendingUpdate = null;
	}
}

export function dispatchSetData<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	data: T,
	props: SavedProps<A, P> | null
) {
	cleanPendingFiberUpdate(fiber);
	if (fiber.pending) {
		cleanFiberTask(fiber.pending);
	}

	// null means setData was called directly, not when ran
	let savedProps =
		props !== null
			? props
			: savedPropsFromDataUpdate<A, P>(data, fiber.payload);

	fiber.version += 1;
	fiber.state = {
		data,
		props: savedProps,
		status: "success",
		timestamp: Date.now(),
	};

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
	cleanPendingFiberUpdate(fiber);
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
	cleanPendingFiberUpdate(fiber);
	if (fiber.pending) {
		cleanFiberTask(fiber.pending);
	}
	fiber.state = state;
	fiber.version += 1;
	dispatchNotification(fiber);
}
