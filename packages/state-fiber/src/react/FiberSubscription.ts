import * as React from "react";
import {
	ErrorState,
	InitialState,
	IStateFiber,
	PendingState,
	SuccessState,
} from "../core/_types";
import {
	HooksStandardOptions,
	IFiberSubscription,
	IFiberSubscriptionAlternate,
	LegacyHooksReturn,
	ModernHooksReturn,
	UseAsyncErrorReturn,
	UseAsyncInitialReturn,
	UseAsyncPendingReturn,
	UseAsyncSuccessReturn,
} from "./_types";
import { __DEV__, didDepsChange, resolveComponentName } from "../utils";
import { isSuspending } from "./FiberSuspense";
import { SUSPENDING } from "./FiberSubscriptionFlags";

let ZERO = 0;
export function useSubscription<T, A extends unknown[], R, P, S>(
	flags: number,
	fiber: IStateFiber<T, A, R, P>,
	options: HooksStandardOptions<T, A, R, P, S>
): IFiberSubscription<T, A, R, P, S> {
	let [, start] = React.useTransition();
	let [, update] = React.useState(ZERO);

	// a subscription is a function, we use a stateUpdater as identity
	// since it is created and bound to the react state hook, so stable
	// and we use it as a source of truth.
	// this updater doesn't get retained until it gets committed
	let previousSubscription = fiber.listeners.get(update);

	if (previousSubscription) {
		// the S part may be wrong during render, but alternate will commit it
		return previousSubscription as IFiberSubscription<T, A, R, P, S>;
	}

	let subscription: IFiberSubscription<T, A, R, P, S> = {
		flags,
		fiber,
		start,
		update,
		options,
		return: null,
		callback: null,
		alternate: null,
		version: fiber.version,
	};
	subscription.callback = () => onFiberStateChange(subscription);
	if (__DEV__) {
		subscription.at = resolveComponentName();
	}
	return subscription;
}

export function inferModernSubscriptionReturn<T, A extends unknown[], R, P, S>(
	subscription: IFiberSubscription<T, A, R, P, S>,
	alternate: IFiberSubscriptionAlternate<T, A, R, P, S>
): ModernHooksReturn<T, A, R, P, S> {
	let fiber = subscription.fiber;
	if (!alternate.return || alternate.version !== fiber.version) {
		let state = fiber.state;
		let value: S | null = null;

		if (state.status !== "error") {
			value = selectStateFromFiber(fiber, alternate.options);
		}

		return createModernSubscriptionReturn(fiber, value);
	}

	let prevOptions = subscription.options;
	let pendingOptions = alternate.options;

	// this means that we need to check what changed in the options
	// todo: complete this
	if (prevOptions !== pendingOptions) {
	}

	// todo: add checks in __DEV__ to throw if we encounter a legacy hook return
	return alternate.return as ModernHooksReturn<T, A, R, P, S>;
}

export function inferLegacySubscriptionReturn<T, A extends unknown[], R, P, S>(
	subscription: IFiberSubscription<T, A, R, P, S>,
	alternate: IFiberSubscriptionAlternate<T, A, R, P, S>
): LegacyHooksReturn<T, A, R, P, S> {
	let fiber = subscription.fiber;
	if (!alternate.return || alternate.version !== fiber.version) {
		let state = fiber.state;
		let value: S | null = null;

		if (state.status !== "error") {
			value = selectStateFromFiber(fiber, alternate.options);
		}

		return createLegacySubscriptionReturn(fiber, value);
	}

	let prevOptions = subscription.options;
	let pendingOptions = alternate.options;

	// this means that we need to check what changed in the options
	// todo: complete this
	if (prevOptions !== pendingOptions) {
	}

	return alternate.return;
}

function createLegacySubscriptionReturn<T, A extends unknown[], R, P, S>(
	fiber: IStateFiber<T, A, R, P>,
	value: S | null
): LegacyHooksReturn<T, A, R, P, S> {
	let state = fiber.state;
	if (fiber.pending) {
		let pending = fiber.pending;
		const pendingState: PendingState<T, A, R, P> = {
			prev: state,
			status: "pending",
			timestamp: Date.now(),
			props: { payload: pending.payload, args: pending.args },
		};
		return createSubscriptionPendingReturn(pendingState, fiber, value as S);
	}

	switch (state.status) {
		case "error": {
			return createSubscriptionErrorReturn(state, fiber);
		}
		case "initial": {
			return createSubscriptionInitialReturn(state, fiber, value as S);
		}
		case "success": {
			return createSubscriptionSuccessReturn(state, fiber, value as S);
		}
		default: {
			throw new Error("This is a bug");
		}
	}
}
function createModernSubscriptionReturn<T, A extends unknown[], R, P, S>(
	fiber: IStateFiber<T, A, R, P>,
	value: S | null
): ModernHooksReturn<T, A, R, P, S> {
	switch (fiber.state.status) {
		case "initial": {
			return createSubscriptionInitialReturn(fiber.state, fiber, value as S);
		}
		case "success": {
			return createSubscriptionSuccessReturn(fiber.state, fiber, value as S);
		}
		case "error":
		default: {
			throw new Error("This is a bug");
		}
	}
}

function createSubscriptionInitialReturn<T, A extends unknown[], R, P, S>(
	state: InitialState<T>,
	fiber: IStateFiber<T, A, R, P>,
	value: S
): UseAsyncInitialReturn<T, A, R, P, S> {
	return {
		state,
		error: null,
		data: value,
		isError: false,
		isInitial: true,
		isPending: false,
		isSuccess: false,
		source: fiber.actions,
	};
}

function createSubscriptionPendingReturn<T, A extends unknown[], R, P, S>(
	state: PendingState<T, A, R, P>,
	fiber: IStateFiber<T, A, R, P>,
	value: S
): UseAsyncPendingReturn<T, A, R, P, S> {
	return {
		state,
		data: value,
		error: null,
		isError: false,
		isInitial: false,
		isPending: true,
		isSuccess: false,
		source: fiber.actions,
	};
}

function createSubscriptionSuccessReturn<T, A extends unknown[], R, P, S>(
	state: SuccessState<T, A, P>,
	fiber: IStateFiber<T, A, R, P>,
	value: S
): UseAsyncSuccessReturn<T, A, R, P, S> {
	return {
		state,
		error: null,
		data: value,
		isError: false,
		isInitial: false,
		isPending: false,
		isSuccess: true,
		source: fiber.actions,
	};
}

function createSubscriptionErrorReturn<T, A extends unknown[], R, P, S>(
	state: ErrorState<A, R, P>,
	fiber: IStateFiber<T, A, R, P>
): UseAsyncErrorReturn<T, A, R, P, S> {
	return {
		state,
		data: null,
		isError: true,
		isInitial: false,
		isPending: false,
		isSuccess: false,
		error: state.error,
		source: fiber.actions,
	};
}

function selectStateFromFiber<T, A extends unknown[], R, P, S>(
	fiber: IStateFiber<T, A, R, P>,
	options: HooksStandardOptions<T, A, R, P, S> | null
) {
	if (options && typeof options === "object" && options.selector) {
		return options.selector(fiber.state);
	}
	// @ts-ignore
	// todo: fix this
	return fiber.state.data as S;
}

export function onFiberStateChange<T, A extends unknown[], R, P, S>(
	subscription: IFiberSubscription<T, A, R, P, S>
) {
	// todo: prepare alternate for the next render
	// todo: bailout pending sometimes, if possible
	let { fiber, version, return: committedReturn } = subscription;
	if (!committedReturn) {
		throw new Error("This is a bug");
	}
	if (fiber.version === version) {
		return;
	}

	let finishedTask = fiber.task;
	let currentSuspender =
		finishedTask && finishedTask.promise && isSuspending(finishedTask.promise);

	// this means that the fiber's most recent "task" was "suspending"
	if (currentSuspender) {
		let isThisSubscriptionSuspending = currentSuspender === subscription.update;
		if (isThisSubscriptionSuspending) {
			// leave react recover it and ignore this notification
			// todo: schedule an auto-recovery if react stops rendering the suspending
			//       tree. This can happen, the delay is TDB (~50-100ms)
			return;
		}
		let isNotPending = !fiber.pending;
		let wasCommittingPending = subscription.return!.isPending;
		if (isNotPending && wasCommittingPending) {
			// this is case do nothing, because since it was suspending
			// the suspender will recover back using react suspense and then it will
			// notify other components from its commit effect
			return;
		}
	}

	ensureSubscriptionIsUpToDate(subscription);
}

// returns true if it did schedule an update for this component
export function ensureSubscriptionIsUpToDate<T, A extends unknown[], R, P, S>(
	subscription: IFiberSubscription<T, A, R, P, S>
): boolean {
	let { fiber, return: committedReturn } = subscription;

	// this may never happen, but let's keep it safe
	if (!committedReturn) {
		return false;
	}

	let state = fiber.state;
	if (state.status === "error") {
		let didReturnError = committedReturn.isError;
		let didErrorChange = state.error !== committedReturn.error;
		if (!didReturnError || didErrorChange) {
			subscription.update(forceComponentUpdate);
			return true;
		}
	} else {
		let willBePending = fiber.pending;
		let isSubscriptionSuspending = subscription.flags & SUSPENDING;
		if (willBePending && isSubscriptionSuspending) {
			// no need to resuspend
			return false;
		}
		// at this point, state is either Initial or Success
		let newValue = selectSubscriptionData(fiber, state, subscription);
		if (
			!Object.is(newValue, committedReturn.data) ||
			!doesPreviousReturnMatchFiberStatus(fiber, state.status, committedReturn)
		) {
			if (isRenderPhaseRun) {
				queueMicrotask(() => {
					subscription.update(forceComponentUpdate);
				});
			} else {
				subscription.update(forceComponentUpdate);
			}
			return true;
		}
	}
	return false;
}

function forceComponentUpdate(prev: number) {
	return prev + 1;
}

// this will check whether the returned version (or the committed one)
// is synced with fiber's state, including pending
// keep it stupid
export function doesPreviousReturnMatchFiberStatus<
	T,
	A extends unknown[],
	R,
	P,
	S
>(
	fiber: IStateFiber<T, A, R, P>,
	status: "initial" | "success",
	previousReturn: LegacyHooksReturn<T, A, R, P, S>
) {
	if (fiber.pending && previousReturn.isPending) {
		let nextArgs = fiber.pending.args;
		let prevArgs = previousReturn.state.props.args;
		let didArgsChange = didDepsChange(prevArgs, nextArgs);
		// if args changed, return doesnt match anymore optimistic, schedule update
		return !didArgsChange;
	}
	if (fiber.pending && !previousReturn.isPending) {
		return false;
	}
	if (previousReturn.isError) {
		return false;
	}
	if (previousReturn.isInitial && status !== "initial") {
		return false;
	}
	if (previousReturn.isSuccess && status !== "success") {
		return false;
	}
	return true;
}

export function selectSubscriptionData<T, A extends unknown[], R, P, S>(
	fiber: IStateFiber<T, A, R, P>,
	state: InitialState<T> | SuccessState<T, A, P>,
	subscription: IFiberSubscription<T, A, R, P, S>
) {
	let options = subscription.options;
	if (options && options.selector) {
		return options.selector(state);
	}
	if (fiber.pending) {
		let previousState = fiber.state;
		if (previousState.status === "error") {
			return null;
		}
		return previousState.data as S;
	} else {
		return state.data as S;
	}
}

let isRenderPhaseRun = false;
export function startRenderPhaseRun(): boolean {
	let prev = isRenderPhaseRun;
	isRenderPhaseRun = true;
	return prev;
}
export function completeRenderPhaseRun(prev) {
	isRenderPhaseRun = prev;
}
