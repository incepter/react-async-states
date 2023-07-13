import {FnProps, ICallbacks, IStateFiber, RuncProps, RunTask} from "./_types";
import { cleanFiberTask, createTask } from "./FiberTask";
import {
	dispatchFiberAbortEvent,
	dispatchFiberRunEvent,
} from "./FiberDispatch";

export function runStateFiber<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	args: A,
	payload: P
) {
	return runcStateFiber(fiber, { args, payload });
}

export function runpStateFiber<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	args: A,
	payload: P
): Promise<any> {
	return new Promise((resolve) => {
		runcStateFiber(fiber, {
			args,
			payload,
			onSuccess: resolve,
			onError: resolve,
		});
	});
}

export function runcStateFiber<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	props: RuncProps<T, A, R, P>
): () => void {
	if (fiber.pending) {
		dispatchFiberAbortEvent(fiber, fiber.pending);
	}

	let callbacks: ICallbacks<T, R> = {
		onError: props.onError,
		onSuccess: props.onSuccess,
	};

	let task = createTask((props.args || []) as A, props.payload as P, callbacks);
	return runFiberTask(fiber, task);
}

function runFiberTask<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	task: RunTask<T, A, R, P>
) {
	let { fn } = fiber.root;

	if (!fn || typeof fn !== "function") {
		throw new Error("Not supported yet");
	}

	// todo: cache support
	// todo: run effects support

	task.clean = () => dispatchFiberAbortEvent(fiber, task);

	// todo: add other effects (emit, select, run)
	// todo:
	task.result = fn({
		args: task.args,
		// todo: this abort is wrong, it can cause infinite pending states
		// we need an abort that's bound to this task, that would bailout the work
		// to the previous state and remove the pending state, and notify if needed
		abort: task.clean,
		onAbort: task.onAbort,
		payload: task.payload,
		signal: task.controller.signal,
		isAborted(): boolean {
			return task.indicators.aborted;
		}
	} as FnProps<T, A, R, P>);

	if (fiber.task) {
		cleanFiberTask(fiber.task);
	}

	dispatchFiberRunEvent(fiber, task);
	return task.clean;
}
