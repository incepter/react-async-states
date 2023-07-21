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
import { noop } from "../utils";

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

function runFiberTask<T, A extends unknown[], R, P>(
	fiber: IStateFiber<T, A, R, P>,
	task: RunTask<T, A, R, P>
) {
	let { fn } = fiber.root;

	if (!fn || typeof fn !== "function") {
		throw new Error("Not supported yet");
	}

	let root = fiber.root;
	let applyEffects = doesRootHaveEffects(root);
	if (applyEffects) {
		let { effect, effectDurationMs } = root.config!;
		switch (effect) {
			case "delay":
			case "debounce": {
				let pendingRun = getFiberPendingRun(fiber);
				if (pendingRun) {
					bailoutPendingRun(pendingRun);
				}
				return scheduleEffectRunOnFiber(fiber, task, effect, effectDurationMs);
			}
			case "throttle": {
				let pendingRun = getFiberPendingRun(fiber);
				if (pendingRun) {
					bailoutPendingRun(pendingRun);
				}
				let latestRanTask = resolveLatestTaskFiberWasRan(fiber);
				if (latestRanTask.at + effectDurationMs > Date.now()) {
					bailoutPendingRun(latestRanTask);
					return scheduleEffectRunOnFiber(
						fiber,
						task,
						effect,
						effectDurationMs
					);
				}
				// do nothing, you are throttled, probably return previous cleanup ?
				return () => {};
			}
			default: {
				throw new Error("Unsupported run effect " + String(effect));
			}
		}
	}

	if (fiber.task) {
		cleanFiberTask(fiber.task);
	}

	if (fiber.pending) {
		cleanFiberTask(fiber.pending);
	}

	let cacheEnabled = hasCacheEnabled(root);
	if (cacheEnabled) {
		let taskHash = computeTaskHash(root, task);
		let existingCache = requestCacheWithHash(fiber, taskHash);
		if (existingCache) {
			let replace = shouldReplaceStateWithCache(existingCache);
			if (replace) {
				replaceFiberStateWithCache(existingCache);
				return noop;
			}
		}
	}

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
		},
	} as FnProps<T, A, R, P>);

	// todo: mark task as cleaned if not a pending promise

	dispatchFiberRunEvent(fiber, task);
	return task.clean;
}

export function hasCacheEnabled(fiber: IStateFiber<any, any, any, any>) {
	return fiber.root.config?.cacheConfig?.enabled || false;
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
