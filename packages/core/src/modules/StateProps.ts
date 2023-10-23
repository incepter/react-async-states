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
import {isAlteringState, startEmitting, stopEmitting} from "./StateUpdate";

export function createProps<T, E, R, A extends unknown[]>(
	instance: StateInterface<T, E, R, A>,
	indicators: RunIndicators,
	payload: unknown,
	runProps: RUNCProps<T, E, R, A> | undefined
): ProducerProps<T, E, R, A> {
	let lastSuccess = instance.lastSuccess;
	let getState = instance.actions.getState;
	let args = (runProps?.args || emptyArray) as A;

	let controller = new AbortController();
	let producerProps: ProducerProps<T, E, R, A> = {
		emit,
		args,
		abort,
		getState,
		lastSuccess,
		payload: payload as any,
		signal: controller.signal,
		onAbort(callback: AbortFn<R>) {
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
		updater: T | StateFunctionUpdater<T, E, R, A>,
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

	function abort(reason?: R): AbortFn<R> | undefined {
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
				instance.actions.replaceState(currentState, true, runProps);
			}
		}

		indicators.cleared = true; // before calling user land onAbort that may emit
		controller.abort(reason);
		instance.currentAbort = undefined;
	}
}
