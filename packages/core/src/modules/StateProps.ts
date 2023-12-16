import {
	AbortFn,
	ProducerProps,
	RUNCProps,
	RunIndicators,
	StateFunctionUpdater,
	StateInterface,
} from "../types";
import { __DEV__, emptyArray, isFunction } from "../utils";
import { pending, Status } from "../enums";
import {
	isAlteringState,
	replaceInstanceState,
	startEmitting,
	stopEmitting
} from "./StateUpdate";

export function createProps<T, A extends unknown[], E>(
	instance: StateInterface<T, A, E>,
	indicators: RunIndicators,
	payload: unknown,
	runProps: RUNCProps<T, A, E> | undefined
): ProducerProps<T, A, E> {
	let lastSuccess = instance.lastSuccess;
	let getState = instance.actions.getState;
	let args = (runProps?.args || emptyArray) as A;

	let controller = new AbortController();
	let producerProps: ProducerProps<T, A, E> = {
		emit,
		args,
		abort,
		getState,
		lastSuccess,
		payload: payload as any,
		signal: controller.signal,
		onAbort(callback: AbortFn) {
			if (isFunction(callback)) {
				controller.signal.addEventListener("abort", () => {
					callback(controller.signal.reason);
				});
			}
		},
		isAborted() {
			return indicators.aborted;
		},
	};

	return producerProps;

	function emit(
		updater: T | StateFunctionUpdater<T, A, E>,
		status?: Status
	): void {
		if (indicators.cleared) {
			return;
		}
		if (!indicators.done) {
			if (__DEV__) {
				console.error(
					"Called props.emit before the producer resolves. This is" +
						" not supported in the library and will have no effect"
				);
			}
			return;
		}

		let prevIsEmitting = startEmitting();
		instance.actions.setState(updater, status, runProps);
		stopEmitting(prevIsEmitting);
	}

	function abort(reason?: any): AbortFn | undefined {
		if (indicators.aborted || indicators.cleared) {
			return;
		}

		if (!indicators.done) {
			indicators.aborted = true;
			let currentState = instance.state;
			if (currentState.status === pending) {
				currentState = currentState.prev;
			}

			// revert back to previous state when aborting only if we won't be updating
			// the state right next.
			let isCurrentlyAlteringState = isAlteringState();
			if (!isCurrentlyAlteringState) {
				replaceInstanceState(instance, currentState, true, runProps);
			}
		}

		indicators.cleared = true; // before calling user land onAbort that may emit
		controller.abort(reason);
		instance.currentAbort = undefined;
	}
}
