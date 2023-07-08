import * as React from "react";
import { IStateFiber } from "../core/_types";
import { HookSubscription, UseAsyncOptions } from "./_types";

export function useSubscription<T, A extends unknown[], R, P, S>(
	fiber: IStateFiber<T, A, R, P>,
	componentState: S,
	componentUpdater: React.Dispatch<React.SetStateAction<S>>,
	options: UseAsyncOptions<T, A, R, P, S>
): HookSubscription<T, A, R, P, S> {
	let start = React.useTransition()[1];

	let subscription = React.useMemo(() => {
		return {
			start,
			fiber,
			flags: 0,
			self: componentUpdater,
		};
	}, [fiber]);

	if (options) {
	}

	return subscription;
}
