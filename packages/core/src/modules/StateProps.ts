import {
	AbortFn,
	ProducerProps,
	RUNCProps,
	RunIndicators,
	StateFunctionUpdater,
	StateInterface,
} from "../types";
import { __DEV__, cloneProducerProps, emptyArray, isFunction } from "../utils";
import { aborted, Status } from "../enums";
import { StateBuilder } from "../helpers/StateBuilder";

export function createProps<T, E, R, A extends unknown[]>(
	instance: StateInterface<T, E, R, A>,
	indicators: RunIndicators,
	payload: unknown,
	runProps: RUNCProps<T, E, R, A> | undefined
): ProducerProps<T, E, R, A> {
	let lastSuccess = instance.lastSuccess;
	let getState = instance._source.getState;
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
				// @ts-ignore
				controller.signal.addEventListener("abort", callback);
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
		let state = getState();
		if (indicators.cleared && state.status === aborted) {
			if (__DEV__) {
				console.error(
					"You are emitting while your producer is passing to aborted state." +
						"This has no effect and not supported by the library. The next " +
						"state value on aborted state is the reason of the abort."
				);
			}
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

		instance.isEmitting = true;
		instance._source.setState(updater, status, runProps);
		instance.isEmitting = false;
	}

	function abort(reason?: R): AbortFn<R> | undefined {
		if (indicators.aborted || indicators.cleared) {
			return;
		}

		if (!indicators.done) {
			indicators.aborted = true;
			// in case we will be running right next, there is no need to step in the
			// aborted state since we'll be immediately (sync) later in pending again, so
			// we bail out this aborted state update.
			// this is to distinguish between aborts that are called from the wild
			// from aborts that will be called synchronously
			// by the library replace the state again
			// these state updates are only with aborted status
			if (!instance.willUpdate) {
				let abortedState = StateBuilder.aborted<T, E, R, A>(
					reason,
					cloneProducerProps(producerProps)
				);
				instance._source.replaceState(abortedState, true, runProps);
			}
		}

		indicators.cleared = true; // before calling user land onAbort that may emit
		controller.abort(reason);
		instance.currentAbort = undefined;
	}
}
