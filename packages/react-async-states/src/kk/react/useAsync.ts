import { HookSubscription, SelfHook, UseAsyncOptions } from "./_types";
import { LibraryContext, requestContext } from "../core/FiberContext";
import React from "react";
import { AsyncContext } from "./Provider";
import { ILibraryContext, IStateFiber } from "../core/_types";
import { StateFiber } from "../core/Fiber";
import { useSubscription } from "./useSubscription";
import {isSuspending, registerSuspendingPromise} from "./Suspense";

export function useAsync<T, A extends unknown[], R, P, S>(
	options: UseAsyncOptions<T, A, R, P, S>,
	deps?: any[]
) {
	let context = useCurrentContext(options);
	let fiber = resolveFiber(context, options);

	// throw early on error
	if (fiber.state.status === "error") {
		throw fiber.state.error;
	}

	// suspend early ..
	if (fiber.pending) {
		// this means that the state is in pending mode, so we'll need to suspend
		// until data arrives. Some other hooks "may not suspend"
		let promise = fiber.pending.promise;
		if (!promise) {
			throw new Error("Pending fiber without a promise.");
		}
		registerSuspendingPromise(promise);

		throw promise;
	} else {
    // check if it was suspending
    let promise = fiber.task?.promise;
    if (promise) {
      let wasSuspending = isSuspending(promise);
      if (wasSuspending) {
        recoverFrom
      }
    }

  }

	let [hook, updater] = React.useState(() => selectFromFiber(fiber, options));
	let previousSubscription = attemptHookPreviousSubscription(fiber, updater);

	// this means that this component was already mounted and subscribed
	// to the state fiber. This implies that we should prevent tearing
	// mutating this hook.alternate will tell that the component is rendering
	// we can always test against: hook.value and hook.alternate?.value
	// these values should always be the same.
	// When the alternate is found while not rendering, this means that
	// the component was rendering and did not commit (suspense/offscreen)
	// The commit of the subscription should always remove the alternate
	if (previousSubscription) {
		// this means that the component rendered before, but without committing
		// probably offscreen, strict mode or something else.
		if (hook.alternate) {
		}
		hook.alternate = {
			alternate: null,
			version: fiber.version,
			value: selectStateFromFiber(fiber, options),
		};
	}
	// this is the first time this hook renders
	// this means that it cannot be out of sync
	// another check will be performed when this subscription commits
	if (!committedValue) {
	}

	let subscription = useSubscription(fiber, hook, updater, options);
	renderFiberAtSubscriptionAndContext(context, fiber, subscription);

	React.useLayoutEffect(() => commitSubscription(subscription));
	return hook;
}

function renderFiberAtSubscriptionAndContext<T, A extends unknown[], R, P, S>(
	context: ILibraryContext,
	fiber: IStateFiber<T, A, R, P>,
	subscription: HookSubscription<T, A, R, P, S>
) {}

function selectFromFiber<T, A extends unknown[], R, P, S>(
	fiber: IStateFiber<T, A, R, P>,
	options: UseAsyncOptions<T, A, R, P, S>
): SelfHook<T, A, R, P, S> {
	let value = selectStateFromFiber(fiber, options) as S;
	return {
		value,
		alternate: null,
		version: fiber.version,
	};
}

function selectStateFromFiber(fiber, options) {
	if (options && typeof options === "object" && options.selector) {
		return options.selector(fiber.state);
	}
	return fiber.state;
}

function resolveFiber<T, A extends unknown[], R, P, S>(
	context: ILibraryContext,
	options: UseAsyncOptions<T, A, R, P, S>
) {
	if (typeof options === "object") {
		let { key, producer, ...config } = options;
		let existingFiber = context.get(key);

		if (existingFiber) {
			let fiberConfig = sliceFiberConfig(options);
			reconcileFiberConfig(existingFiber, fiberConfig);
			return existingFiber as IStateFiber<T, A, R, P>;
		}

		let newFiber = new StateFiber({ key, config, fn: producer }, context);
		context.set(key, newFiber); // todo: not always (standalone ;))
		return newFiber as IStateFiber<T, A, R, P>;
	}
	throw new Error("Not supported yet");
}

function sliceFiberConfig(options) {
	return options; // todo
}

function reconcileFiberConfig(fiber, config) {
	// todo
}

function useCurrentContext(options): ILibraryContext {
	let reactContext = React.useContext(AsyncContext);
	let desiredContext = typeof options === "object" ? options.context : null;

	if (desiredContext) {
		return requestContext(desiredContext);
	}

	if (reactContext) {
		return reactContext;
	}

	return requestContext(null); // global context
}
