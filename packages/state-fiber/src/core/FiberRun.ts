import {
	FnProps,
	ICallbacks,
	IStateFiber,
	RuncProps,
	RunTask,
	StateRoot,
} from "./_types";
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
	let callbacks: ICallbacks<T, R> = {
		onError: props.onError,
		onSuccess: props.onSuccess,
	};

	let task = createTask((props.args || []) as A, props.payload as P, callbacks);
	return runFiberTask(fiber, task);
}

function bailoutFiberPendingRun(fiber: IStateFiber<any, any, any, any>) {
	if (!fiber.pendingRun) {
		return;
	}
	clearTimeout(fiber.pendingRun.id);
	fiber.pendingRun = null;
}

function scheduledTaskRun<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	task: RunTask<T, A, R, P>
) {
	if (!task.indicators.aborted) {
		let pendingRun = fiber.pendingRun;
		if (!pendingRun) {
			throw new Error("This is a bug");
		}

		// removed the pending run
		clearTimeout(pendingRun.id);
		fiber.pendingRun = null;

		executeFiberTask(fiber, task);
	}
}

function scheduleRunOnFiber<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	task: RunTask<T, A, R, P>,
	effectDurationMs: number
) {
	let id = setTimeout(() => scheduledTaskRun(fiber, task), effectDurationMs);
	fiber.pendingRun = { id, at: Date.now() };

	// cleanup
	return () => clearTimeout(id);
}

function resolveLatestTaskFiberWasRan<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>
) {
	let { pending, task } = fiber;
	if (pending) {
		if (!task) {
			return pending;
		}
		return pending.at > task.at ? pending : task;
	} else if (task) {
		return task;
	}
	return null;
}

function runFiberTask<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	task: RunTask<T, A, R, P>
) {
	let root = fiber.root;
	let applyEffects = doesRootHaveEffects(root);
	if (applyEffects) {
		let { effect, effectDurationMs } = root.config!;
		let effectDuration = effectDurationMs!;
		switch (effect) {
			case "delay":
			case "debounce": {
				let pendingRun = fiber.pendingRun;
				if (pendingRun) {
					bailoutFiberPendingRun(fiber);
				}
				return scheduleRunOnFiber(fiber, task, effectDuration);
			}
			case "throttle": {
				let pendingRun = fiber.pendingRun;
				if (pendingRun) {
					bailoutFiberPendingRun(fiber);
				}
				let latestRanTask = resolveLatestTaskFiberWasRan(fiber);
				if (latestRanTask) {
					let isElapsed = Date.now() - latestRanTask.at > effectDuration;
					if (isElapsed) {
						return executeFiberTask(fiber, task);
					} else {
						// do nothing, you are throttled, probably return previous cleanup ?
						return () => {};
					}
				} else {
					return executeFiberTask(fiber, task);
				}
			}
			default: {
				throw new Error("Unsupported run effect " + String(effect));
			}
		}
	}

	return executeFiberTask(fiber, task);
}

function executeFiberTask<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	task: RunTask<T, A, R, P>
) {
	let {
		root: { fn },
		task: latestTask,
		pending: pendingTask,
	} = fiber;

	if (!fn || typeof fn !== "function") {
		throw new Error("Not supported yet");
	}

	if (latestTask) {
		cleanFiberTask(latestTask);
	}

	if (pendingTask) {
		cleanFiberTask(pendingTask);
	}

	// let cacheEnabled = hasCacheEnabled(fiber.root);
	// if (cacheEnabled) {
	// 	let taskHash = computeTaskHash(root, task);
	// 	let existingCache = requestCacheWithHash(fiber, taskHash);
	// 	if (existingCache) {
	// 		let replace = shouldReplaceStateWithCache(existingCache);
	// 		if (replace) {
	// 			replaceFiberStateWithCache(existingCache);
	// 			return noop;
	// 		}
	// 	}
	// }

	task.clean = () => dispatchFiberAbortEvent(fiber, task);

	// todo: add other effects (emit, select, run)
	// todo: catch this execution
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
		},
	} as FnProps<T, A, R, P>);

	// todo: mark task as cleaned if not a pending promise

	dispatchFiberRunEvent(fiber, task);
	return task.clean;
}

export function hasCacheEnabled(root: StateRoot<any, any, any, any>) {
	return root.config?.cacheConfig?.enabled || false;
}

export function doesRootHaveEffects(root: StateRoot<any, any, any, any>) {
	let config = root.config;
	if (!config) {
		return false;
	}
	let enableByEffect = !!config.effect || false;
	if (enableByEffect) {
		return (config.effectDurationMs || 0) > 0;
	}
}
