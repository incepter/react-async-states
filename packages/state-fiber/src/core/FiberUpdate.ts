import {
	FiberDataUpdater,
	IStateFiber,
	RunTask,
	State,
	StateFiberUpdate,
	UpdateQueue,
} from "./_types";
import {
	createDataUpdate,
	createDataUpdater,
	createErrorUpdate,
	createPendingUpdate,
	createStateUpdate,
	createStateUpdater,
	flushDataUpdate,
	flushDataUpdater,
	flushErrorUpdate,
	flushPendingUpdate,
	flushStateUpdate,
	flushStateUpdater,
	UPDATE_KIND_PENDING,
	UPDATE_KIND_SET_DATA,
	UPDATE_KIND_SET_DATA_FUNC,
	UPDATE_KIND_SET_ERROR,
	UPDATE_KIND_SET_STATE,
	UPDATE_KIND_SET_STATE_FUNC,
} from "./FiberUpateHelpers";
import { dispatchNotification } from "./FiberDispatch";

function enqueueUpdate<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	updateToQueue: UpdateQueue<T, A, R, P>
) {
	if (!fiber.queue) {
		fiber.queue = updateToQueue;
	} else {
		let tail: UpdateQueue<T, A, R, P> = fiber.queue;

		while (tail.next !== null) {
			tail = tail.next;
		}

		tail.next = updateToQueue;
	}
}

export function ensureFiberQueueIsScheduled<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	delay: number
) {
	if (fiber.queueId) {
		clearTimeout(fiber.queueId);
	}
	let queueId = setTimeout(() => {
		if (fiber.queueId === queueId) {
			attemptToFlushUpdateQueue(fiber);
			dispatchNotification(fiber);
			fiber.queueId = null;
		}
	}, delay);

	fiber.queueId = queueId;
}

function attemptToFlushUpdateQueue<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>
) {
	// the first thing to check before flushing the queue is whether the fiber
	// is pending, and we have keepPending configured.

	if (!fiber.queue) {
		return;
	}

	let isFiberPending = !!fiber.pending;
	let hasKeepPending = (fiber.root.config?.keepPendingForMs || 0) > 0;

	if (isFiberPending && hasKeepPending) {
		// when it is pending with keepPending configured
		// this means that we should skip this processing and flush until the
		// pending state is over (keepPending delay elapsed)

		// Moreover, we should ensure that the queue processing is scheduled

		let now = Date.now();
		let pendingStartedAt = fiber.pending!.at;
		let rootConfig = fiber.root.config!;
		let delay: number = rootConfig.keepPendingForMs!;
		let skipPendingDelay: number = rootConfig.skipPendingDelayMs || 0;

		let realElapsedStart = pendingStartedAt + skipPendingDelay;
		let elapsedTime = now - realElapsedStart;
		let didKeepPendingExpire = now > realElapsedStart + delay;

		if (didKeepPendingExpire) {
			imperativelyFlushQueue(fiber);
			return;
		} else {
			ensureFiberQueueIsScheduled(fiber, delay);
		}
	} else {
		imperativelyFlushQueue(fiber);
	}
}

function imperativelyFlushQueue<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>
) {
	let queue = fiber.queue;
	if (queue) {
		while (queue !== null) {
			switch (queue.kind) {
				case UPDATE_KIND_SET_DATA: {
					flushDataUpdate(fiber, queue.value, queue.task);
					break;
				}
				case UPDATE_KIND_SET_DATA_FUNC: {
					flushDataUpdater(fiber, queue.value, queue.task);
					break;
				}
				case UPDATE_KIND_SET_ERROR: {
					flushErrorUpdate(fiber, queue.value, queue.task);
					break;
				}
				case UPDATE_KIND_SET_STATE: {
					flushStateUpdate(fiber, queue.value, queue.task);
					break;
				}
				case UPDATE_KIND_SET_STATE_FUNC: {
					flushStateUpdater(fiber, queue.value, queue.task);
					break;
				}
				case UPDATE_KIND_PENDING: {
					flushPendingUpdate(fiber, queue.task);
					break;
				}
			}
			queue = queue.next;
		}
		fiber.queue = null;
	}
}

// use the queue if:
// 1. there is already a queue
// 2. config.keepPending is configured and fiber is pending
function shouldEnqueueUpdate(fiber: IStateFiber<any, any, any, any>) {
	if (fiber.queue) {
		return true;
	}

	let config = fiber.root.config;
	if (config && (config.keepPendingForMs || 0) > 0) {
		let isFiberPending = !!fiber.pending;
		// pending state is always stored in fiber.pending
		return isFiberPending;
	}

	return false;
}

export function enqueueDataUpdate<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	update: StateFiberUpdate<T>,
	task: RunTask<T, A, R, P> | null
) {
	let shouldUseQueue = shouldEnqueueUpdate(fiber);
	// shortcut when queue isn't applied
	if (!shouldUseQueue) {
		if (typeof update === "function") {
			flushDataUpdater(fiber, update as (prev: T) => T, task);
		} else {
			flushDataUpdate(fiber, update, task);
		}

		return;
	}

	let updateToQueue: UpdateQueue<T, A, R, P>;

	if (typeof update === "function") {
		updateToQueue = createDataUpdater(update as FiberDataUpdater<T>, task);
	} else {
		updateToQueue = createDataUpdate(update, task);
	}

	enqueueUpdate(fiber, updateToQueue);
	attemptToFlushUpdateQueue(fiber);
}

export function enqueueErrorUpdate<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	error: R,
	task: RunTask<T, A, R, P> | null
) {
	let shouldUseQueue = shouldEnqueueUpdate(fiber);
	// shortcut when queue isn't applied
	if (!shouldUseQueue) {
		flushErrorUpdate(fiber, error, task);
		return;
	}

	let updateToQueue = createErrorUpdate<T, A, R, P>(error, task);

	enqueueUpdate(fiber, updateToQueue);
	attemptToFlushUpdateQueue(fiber);
}

export function enqueueStateUpdate<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	update: State<T, A, R, P> | ((prev: State<T, A, R, P>) => State<T, A, R, P>),
	task: RunTask<T, A, R, P> | null
) {
	let shouldUseQueue = shouldEnqueueUpdate(fiber);
	// shortcut when queue isn't applied
	if (!shouldUseQueue) {
		if (typeof update === "function") {
			flushStateUpdater(fiber, update, task);
		} else {
			flushStateUpdate(fiber, update, task);
		}

		return;
	}

	let updateToQueue: UpdateQueue<T, A, R, P>;

	if (typeof update === "function") {
		updateToQueue = createStateUpdater(update, task);
	} else {
		updateToQueue = createStateUpdate(update, task);
	}

	enqueueUpdate(fiber, updateToQueue);
	attemptToFlushUpdateQueue(fiber);
}

export function enqueuePendingUpdate<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	task: RunTask<T, A, R, P>
) {
	let shouldUseQueue = shouldEnqueueUpdate(fiber);

	// this means that the queue is populated or keepPending will tick now
	if (!shouldUseQueue) {
		flushPendingUpdate(fiber, task);
		let hasKeepPending = (fiber.root.config?.keepPendingForMs || 0) > 0;

		if (hasKeepPending) {
			let keepPendingDuration = fiber.root.config!.keepPendingForMs!;
			ensureFiberQueueIsScheduled(fiber, keepPendingDuration);
		}

		return;
	}

	let updateToQueue = createPendingUpdate(task);

	enqueueUpdate(fiber, updateToQueue);
	attemptToFlushUpdateQueue(fiber);
}

export function isFunction(fn: any): fn is Function {
	return typeof fn === "function";
}
