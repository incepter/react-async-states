import {
	AsyncStateKeyOrSource,
	Source,
	requestContext,
	StateInterface,
	isSource,
} from "async-states";

export function run<T, A extends unknown[], E>(
	keyOrSource: AsyncStateKeyOrSource<T, A, E>,
	...args: A
) {
	return runImpl(keyOrSource, null, undefined, ...args);
}

export function runLane<T, A extends unknown[], E>(
	keyOrSource: AsyncStateKeyOrSource<T, A, E>,
	lane: string | undefined,
	...args: A
) {
	return runImpl(keyOrSource, null, lane, ...args);
}
export function runInContext<T, A extends unknown[], E>(
	keyOrSource: AsyncStateKeyOrSource<T, A, E>,
	context: any,
	...args: A
) {
	return runImpl(keyOrSource, context, undefined, ...args);
}

export function runLaneInContext<T, A extends unknown[], E>(
	keyOrSource: AsyncStateKeyOrSource<T, A, E>,
	context: any,
	lane: string | undefined,
	...args: A
) {
	return runImpl(keyOrSource, context, lane, ...args);
}

function runImpl<T, A extends unknown[], E>(
	keyOrSource: AsyncStateKeyOrSource<T, A, E>,
	context: any,
	lane: string | undefined,
	...args: A
) {
	if (isSource(keyOrSource)) {
		return (keyOrSource as Source<T, A, E>).getLane(lane).run(...args);
	}
	if (typeof keyOrSource === "string") {
		let instance = requestContext(context).get(keyOrSource) as StateInterface<
			T,
			A,
			E
		>;
		if (instance) {
			return instance.actions.run.apply(null, args);
		}
	}
	return undefined;
}
