import { IStateFiber, State, StateFiberUpdate } from "./_types";
import {
	dispatchSetData,
	dispatchSetError,
	dispatchFiberStateChangeEvent,
} from "./FiberDispatch";

export function enqueueDataUpdate<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	update: StateFiberUpdate<T>
) {
	// todo: check queue
	// todo: bring a succeeded state rather than stamping into error
	if (isFunction(update)) {
		const current = fiber.state;
		try {
			if (current.status === "success") {
				dispatchSetData(fiber, update(current.data), null);
			} else {
				let initialState = fiber.root.config?.initialValue as T;
				dispatchSetData(fiber, update(initialState), null);
			}
		} catch (e) {
			enqueueErrorUpdate(fiber, e);
		}
	} else {
		dispatchSetData(fiber, update, null);
	}
}

export function enqueueErrorUpdate<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	error: R
) {
	// todo: check queue
	dispatchSetError(fiber, error, null);
}

export function enqueueStateUpdate<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	state: State<T, A, R, P> | ((prev: State<T, A, R, P>) => State<T, A, R, P>)
) {
	// todo: check queue
	if (typeof state !== "function") {
		dispatchFiberStateChangeEvent(fiber, state);
		return;
	}
	const current = fiber.state;
	try {
		const next = state(current);
		dispatchFiberStateChangeEvent(fiber, next);
	} catch (e) {
		enqueueErrorUpdate(fiber, e);
	}
}

export function isFunction(fn): fn is Function {
	return typeof fn === "function";
}
