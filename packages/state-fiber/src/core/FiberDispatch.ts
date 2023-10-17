import {
	FiberPromise,
	FulfilledPromise,
	IStateFiber,
	RejectedPromise,
	RunTask,
	SavedProps,
} from "./_types";
import { cleanFiberTask } from "./FiberTask";
import {
	enqueueDataUpdate,
	enqueueErrorUpdate,
	enqueuePendingUpdate,
} from "./FiberUpdate";

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

export function trackPendingFiberPromise<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	task: RunTask<T, A, R, P>
) {
	let indicators = task.indicators;
	// this is the pending path, the task is always pending
	let promise = task.result as FiberPromise<T, R>;
	task.promise = promise;

	// this means this promise has never been tracked or used by the lib or react
	if (!promise.status) {
		let untrackedPromise = promise as FiberPromise<T, R>;
		untrackedPromise.status = "pending";
		untrackedPromise.then(
			(value: T) => {
				untrackedPromise.status = "fulfilled";
				(untrackedPromise as FulfilledPromise<T>).value = value;

				if (!indicators.aborted) {
					enqueueDataUpdate(fiber, value, task);
					dispatchNotification(fiber);
				}
			},
			(error: R) => {
				untrackedPromise.status = "rejected";
				(untrackedPromise as RejectedPromise<R>).reason = error;
				if (!indicators.aborted) {
					enqueueErrorUpdate(fiber, error, task);
					dispatchNotification(fiber);
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
	let config = fiber.root.config;

	// the first thing is to check whether this "pending" update should be
	// delayed or skipped.
	// If the fiber is already pending, then "skipPending" has no effect.
	// if the fiber isn't pending, and "skipPending" is configured, then it should
	// delay it a little.
	if (
		!fiber.pending && // fiber.pending holds the pending state
		// means we have skipPending configured with a positive delay
		config &&
		config.skipPendingDelayMs &&
		config.skipPendingDelayMs > 0
	) {
		let now = Date.now();
		let pendingUpdateAt = now;
		let delay = config.skipPendingDelayMs;

		// if a previous pending update is scheduled, we should remove the elapsed
		// time from the delay
		let pendingUpdate = fiber.pendingUpdate;
		if (pendingUpdate) {
			// this cleanup after referencing ensures that pendingUpdate.task
			// gets invalidated so even if it resolves later, it doesn't affect fiber
			cleanPendingFiberUpdate(fiber, task);
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
					cleanPendingFiberUpdate(fiber, task);
					enqueuePendingUpdate(fiber, task);
					if (notifyOnPending) {
						dispatchNotification(fiber);
					}
				}
			}
		}, delay);
		fiber.pendingUpdate = { id, at: pendingUpdateAt, task };
	} else {
		cleanPendingFiberUpdate(fiber, task);
		enqueuePendingUpdate(fiber, task);
		if (notifyOnPending) {
			dispatchNotification(fiber);
		}
	}
}

// pending update has a status "pending", we may delay it if we choose
// to skipPending under some delay.
// How skipPending works: when the run yields a promise and skipPending
// is configured, it is delayed by the chosen delay and not added to the
// queue immediately. When a non "pending" update arrives, the delayed
// pending has no sense any more and should be removed.
export function cleanPendingFiberUpdate(
	fiber: IStateFiber<any, any, any, any>,
	task: RunTask<any, any, any, any> | null
) {
	let pendingUpdate = fiber.pendingUpdate;
	if (pendingUpdate) {
		if (task !== null && pendingUpdate.task !== task) {
			// mark the pending task as aborted only if it is not the current one
			cleanFiberTask(pendingUpdate.task);
		}

		// clear the scheduled pending update
		clearTimeout(pendingUpdate.id);
		// remove the update from the fiber
		fiber.pendingUpdate = null;
	}
}

export function savedPropsFromDataUpdate<A extends unknown[], P>(
	data,
	payload: P
): SavedProps<A, P> {
	// sorry..
	return {
		args: [data],
		payload: Object.assign({}, payload),
	} as SavedProps<A, P>;
}
