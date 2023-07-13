import { IStateFiber, State, StateFiberUpdate, SuccessState } from "./_types";
import {
	dispatchFiberDataEvent,
	dispatchFiberErrorEvent,
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
				dispatchFiberDataEvent(fiber, update(current.data));
			} else {
				let initialState = fiber.root.config?.initialValue as T;
				dispatchFiberDataEvent(fiber, update(initialState));
			}
		} catch (e) {
			enqueueErrorUpdate(fiber, e);
		}
	} else {
		dispatchFiberDataEvent(fiber, update);
		return;
	}
}

export function enqueueErrorUpdate<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	error: R
) {
	// todo: check queue
	dispatchFiberErrorEvent(fiber, error);
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
