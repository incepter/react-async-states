import * as React from "react";
import { State } from "async-states";
import {
	BaseConfig,
	MixedConfig,
	PartialUseAsyncStateConfiguration,
	UseAsyncState,
} from "./types.internal";
import { __DEV__, didDepsChange, emptyArray } from "./shared";
import { useExecutionContext } from "./hydration/context";
import {
	autoRun,
	createHook,
	HookOwnState,
	hookReturn,
} from "./state-hook/StateHook";
import {
	CHANGE_EVENTS,
	CONCURRENT,
	CONFIG_OBJECT,
	FORK,
	SOURCE,
	WAIT,
} from "./state-hook/StateHookFlags";

function getContextFromMixedConfig(mixedConfig) {
	if (typeof mixedConfig !== "object") {
		return undefined;
	}
	return mixedConfig.context;
}

let didWarnAboutDeprecatingForkFeature = false;
let didWarnAboutDeprecatingWaitFeature = false;
let didWarnAboutDeprecatingChangeEventsOption = false;
function warnInDevAboutOptionsDeprecation(
	hook: HookOwnState<any, any, any, any, any>
) {
	let flags = hook.flags;
	if (flags & CHANGE_EVENTS && !didWarnAboutDeprecatingChangeEventsOption) {
		didWarnAboutDeprecatingChangeEventsOption = true;
		console.error(
			"[WARNING] - useAsyncState 'events.change' option is " +
				"deprecated. Use source.runc({ onSuccess, onError }) directly. " +
				"source is returned from useAsyncState and createSource. If you need to " +
				"react to status changes, check the onChange API or useEffect."
		);
	}
	if (flags & WAIT && !didWarnAboutDeprecatingWaitFeature) {
		didWarnAboutDeprecatingWaitFeature = true;
		console.error(
			"[WARNING] - useAsyncState 'wait' option is deprecated. " +
				"We found no use cases for it in practice. The state will be created " +
				"either ways. It should have no harm and you can reason about it using " +
				"the existing features, such as status and payload."
		);
	}
	if (flags & FORK && !didWarnAboutDeprecatingForkFeature) {
		didWarnAboutDeprecatingForkFeature = true;
		console.error(
			"[WARNING] - useAsyncState 'fork' option is deprecated. " +
				"Create the source with the desired key independently and use it."
		);
	}
}

export const useInternalAsyncState = function useAsyncStateImpl<
	T,
	E,
	R,
	A extends unknown[],
	S = State<T, E, R, A>
>(
	callerName: string | undefined,
	mixedConfig: MixedConfig<T, E, R, A, S>,
	deps: any[] = emptyArray,
	overrides?: PartialUseAsyncStateConfiguration<T, E, R, A, S>
): UseAsyncState<T, E, R, A, S> {
	// the current library's execution context
	let execContext = useExecutionContext(getContextFromMixedConfig(mixedConfig));
	// used when waiting for a state to exist, this will trigger a recalculation
	let [guard, setGuard] = React.useState<number>(0);
	// this contains everything else, from the dependencies to configuration
	// to internal variables used by the library
	let [hook, setHook] =
		React.useState<HookOwnState<T, E, R, A, S>>(createOwnHook);
	// the reference towards this "hook" object changes every state update
	// to ensure a certain isolation and that react would actually react to it
	// so no logic should depend on the "hook" object itself, but to what it holds
	let { flags, context, instance, base, renderInfo, config } = hook;

	// performs subscription and events firing
	React.useEffect(
		() => hook.subscribeEffect(updateReturnState, setGuard),
		[renderInfo, flags, instance].concat(deps)
	);
	// will auto run if necessary
	React.useEffect(() => autoRun(flags, instance?.actions, config), deps);

	//
	renderInfo.version = instance?.version;
	renderInfo.current = hook.return.state;

	if (
		hook.guard !== guard ||
		context !== execContext ||
		didDepsChange(hook.deps, deps)
	) {
		setHook(createOwnHook());
	}

	// optimistic lock to never tear and stay up to date
	if (instance && hook.return.version !== instance.version) {
		updateReturnState();
	}

	if (flags & CONCURRENT) {
		// both: when status is initial and pending, it will throw a promise
		// false: don't throw to error boundary in case of problems
		if (
			flags & CONFIG_OBJECT &&
			!(flags & SOURCE) &&
			!(mixedConfig as BaseConfig<any, any, any, any>).key
		) {
			if (__DEV__) {
				console.error(
					"Concurrent isn't supported without giving a key or source"
				);
			}
		} else {
			hook.return.read("both", false);
		}
	}

	if (__DEV__) {
		warnInDevAboutOptionsDeprecation(hook);
	}

	return hook.return;

	function updateReturnState() {
		setHook((prev) => {
			let newReturn = hookReturn(flags, config, base, instance);
			return Object.assign({}, prev, { return: newReturn });
		});
	}

	function createOwnHook(): HookOwnState<T, E, R, A, S> {
		return createHook(
			execContext,
			mixedConfig,
			deps,
			guard,
			overrides,
			callerName
		);
	}
};
