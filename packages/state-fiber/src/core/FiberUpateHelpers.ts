import {
	FiberDataUpdater,
	FiberErrorUpdate,
	FiberStateUpdate,
	FiberStateUpdater,
	IStateFiber,
	RunTask,
	SavedProps,
	UpdateQueue,
} from "./_types";
import {
	cleanPendingFiberUpdate,
	savedPropsFromDataUpdate,
} from "./FiberDispatch";
import { cleanFiberTask } from "./FiberTask";
import { hasCacheEnabled } from "./FiberCache";

export const UPDATE_KIND_SET_DATA /*      */ = 0 as const;
export const UPDATE_KIND_SET_DATA_FUNC /* */ = 1 as const;
export const UPDATE_KIND_SET_ERROR /*     */ = 2 as const;
export const UPDATE_KIND_SET_STATE /*     */ = 3 as const;
export const UPDATE_KIND_SET_STATE_FUNC /**/ = 4 as const;
export const UPDATE_KIND_PENDING /*       */ = 5 as const;

export function createDataUpdate<T, A extends unknown[], R, P>(
	data: T,
	task: RunTask<T, A, R, P> | null
): UpdateQueue<T, A, R, P> {
	return {
		task,
		next: null,
		value: data,
		kind: UPDATE_KIND_SET_DATA,
	};
}
export function flushDataUpdate<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	value: T,
	task: RunTask<T, A, R, P> | null
) {
	cleanPendingFiberUpdate(fiber, task);

	if (fiber.pending) {
		let pendingTask = fiber.pending;
		fiber.pending = null;
		cleanFiberTask(pendingTask);
	}

	// null means setData was called directly, not when ran
	let savedProps: SavedProps<A, P> =
		task !== null
			? { args: task.args, payload: task.payload }
			: savedPropsFromDataUpdate<A, P>(value, fiber.payload);

	fiber.task = task;
	fiber.version += 1;

	let newState = {
		data: value,
		props: savedProps,
		timestamp: Date.now(),
		status: "success" as const,
	};

	fiber.state = newState;

	let successCallback = task?.callbacks?.onSuccess;
	if (typeof successCallback === "function") {
		successCallback(value);
	}

	// this means only one thing: cache is enabled, and we should store this state
	if (task && task.hash !== null) {
		if (!fiber.cache) {
			fiber.cache = {};
		}

		fiber.cache[task.hash] = {
			state: newState,
			at: newState.timestamp,
		};

		let cachePersistFunction = fiber.root.config?.cacheConfig?.persist;
		if (cachePersistFunction) {
			cachePersistFunction(fiber.cache);
		}
	}

	if (
		task === fiber.pending ||
		(fiber.pendingUpdate && task === fiber.pendingUpdate.task)
	) {
		fiber.task = task;
		fiber.pending = null;
	}
}

export function createDataUpdater<T, A extends unknown[], R, P>(
	data: FiberDataUpdater<T>,
	task: RunTask<T, A, R, P> | null
): UpdateQueue<T, A, R, P> {
	return {
		task,
		next: null,
		value: data,
		kind: UPDATE_KIND_SET_DATA_FUNC,
	};
}
export function flushDataUpdater<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	value: FiberDataUpdater<T>,
	task: RunTask<T, A, R, P> | null
) {
	let newData: T;
	let updater = value;
	let currentState = fiber.state;

	try {
		if (currentState.status === "success") {
			newData = updater(currentState.data);
		} else {
			let initialState = fiber.root.config?.initialValue as T;
			newData = updater(initialState);
		}

		return flushDataUpdate(fiber, newData, task);
	} catch (e) {
		return flushErrorUpdate(fiber, e as R, task);
	}
}

export function createErrorUpdate<T, A extends unknown[], R, P>(
	error: FiberErrorUpdate<R>,
	task: RunTask<T, A, R, P> | null
): UpdateQueue<T, A, R, P> {
	return {
		task,
		next: null,
		value: error,
		kind: UPDATE_KIND_SET_ERROR,
	};
}
export function flushErrorUpdate<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	value: R,
	task: RunTask<T, A, R, P> | null
) {
	cleanPendingFiberUpdate(fiber, task);
	if (fiber.pending) {
		let pendingTask = fiber.pending;
		fiber.pending = null;
		cleanFiberTask(pendingTask);
	}

	// null means setData was called directly, not when ran
	let savedProps =
		task !== null
			? { args: task.args, payload: task.payload }
			: savedPropsFromDataUpdate<A, P>(value, fiber.payload);

	fiber.task = task;
	fiber.state = {
		error: value,
		status: "error",
		props: savedProps,
		timestamp: Date.now(),
	};
	fiber.version += 1;

	let errorCallback = task?.callbacks?.onError;
	if (typeof errorCallback === "function") {
		errorCallback(value);
	}

	if (
		task === fiber.pending ||
		(fiber.pendingUpdate && task === fiber.pendingUpdate.task)
	) {
		fiber.task = task;
		fiber.pending = null;
	}
}

export function createStateUpdate<T, A extends unknown[], R, P>(
	state: FiberStateUpdate<T, A, R, P>,
	task: RunTask<T, A, R, P> | null
): UpdateQueue<T, A, R, P> {
	return {
		task,
		next: null,
		value: state,
		kind: UPDATE_KIND_SET_STATE,
	};
}
export function flushStateUpdate<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	value: FiberStateUpdate<T, A, R, P>,
	task: RunTask<T, A, R, P> | null
) {
	cleanPendingFiberUpdate(fiber, task);
	if (fiber.pending) {
		let pendingTask = fiber.pending;
		fiber.pending = null;
		cleanFiberTask(pendingTask);
	}

	fiber.task = task;
	fiber.version += 1;
	fiber.state = value;
}

export function createStateUpdater<T, A extends unknown[], R, P>(
	state: FiberStateUpdater<T, A, R, P>,
	task: RunTask<T, A, R, P> | null
): UpdateQueue<T, A, R, P> {
	return {
		task,
		next: null,
		value: state,
		kind: UPDATE_KIND_SET_STATE_FUNC,
	};
}
export function flushStateUpdater<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	value: FiberStateUpdater<T, A, R, P>,
	task: RunTask<T, A, R, P> | null
) {
	return flushStateUpdate(fiber, value(fiber.state), task);
}

export function createPendingUpdate<T, A extends unknown[], R, P>(
	task: RunTask<T, A, R, P>
): UpdateQueue<T, A, R, P> {
	return {
		task,
		next: null,
		kind: UPDATE_KIND_PENDING,
	};
}
export function flushPendingUpdate<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	task: RunTask<T, A, R, P>
) {
	fiber.version += 1;
	fiber.pending = task;
}
