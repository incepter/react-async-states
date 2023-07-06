import * as React from "react";
import {
	BoundConfig,
	boundSourceSymbol,
	BoundSourceType,
	commitAlternate,
	Fn,
	GeneralStateConfig,
	getGlobalContextObject,
	unboundSourceSymbol,
	UnboundSourceType,
} from "./source";

type AsyncProviderProps = {
	context?: any;
	// todo: split this type to two: one with context and without inherit
	//  and with inherit as true and no context
	// inherit means: use parent provider's context if there is any
	inherit?: boolean;
	// options to be inherited by any constructed source in this tree
	options?: GeneralStateConfig;
	// the tree
	children: React.ReactNode;
};

interface AsyncContextType {
	context: any;
	options?: GeneralStateConfig;
}

const AsyncContext = React.createContext<AsyncContextType | null>(null);

export function AsyncProvider(props: AsyncProviderProps) {
	const { context, children, inherit, options } = props;
	const parentContext = React.useContext(AsyncContext);

	const contextValue = React.useMemo(() => {
		let contextToUse = context;

		if (inherit) {
			contextToUse = parentContext;
		}

		return {
			options,
			context: contextToUse,
		};
	}, [parentContext, context, inherit, options]);

	return (
		<AsyncContext.Provider value={contextValue}>
			{children}
		</AsyncContext.Provider>
	);
}

function isSource<T, A extends unknown[], R, P>(
	src: any
): src is UnboundSourceType<T, A, R, P> {
	if (!src) {
		return false;
	}
	return src[unboundSourceSymbol] || src[boundSourceSymbol];
}

type UseAsyncOptions<T, A extends unknown[], R, P, S> =
	| string
	| Fn<T, A, R, P>
	| BoundSourceType<T, A, R, P>
	| UnboundSourceType<T, A, R, P>
	| UseAsyncConfigObject<T, A, R, P, S>;

interface UseAsyncConfigObject<T, A extends unknown[], R, P, S>
	extends BoundConfig<T, A, R, P> {
	key?: string;
	producer?: Fn<T, A, R, P>;
}

function resolveFiberFromContext<T, A extends unknown[], R, P, S>(
	context: AsyncContextType | null,
	options: UseAsyncOptions<T, A, R, P, S>
): BoundSourceType<T, A, R, P> {
	const contextToUse =
		context !== null ? context.context : getGlobalContextObject();

	if (typeof options === "function") {
		throw new Error("Not implemented yet");
	} else {
		// the most basic way, and less work
		if (isSource<T, A, R, P>(options)) {
			const isBoundSource = options[boundSourceSymbol];
			if (isBoundSource) {
				return options as BoundSourceType<T, A, R, P>;
			}
			return options.bind(contextToUse);
		}

		throw new Error("Not implemented yet");
	}
}

function render(source) {}

export function useAsync<T, A extends unknown[], R, P, S>(
	options: UseAsyncOptions<T, A, R, P, S>,
	dependencies: any[] = []
): UseAsyncReturn<T, A, R, P, S> {
	const context = React.useContext(AsyncContext);
	const boundSource = resolveFiberFromContext(context, options);

	const [state, setState] =
		React.useState<UseAsyncReturn<T, A, R, P, S>>(constructState);

	React.useEffect(() => {
		const unsubscribe = boundSource.subscribe(() => {
			setState(constructState);
		});

		return () => {
			unsubscribe();
		};
	});

	return state;

	function constructState() {
		return {
			// @ts-ignore
			data: boundSource.getState().data,
			// @ts-ignore
			error: boundSource.getState().error,

			state: boundSource.getState(),
		};
	}
}

function retainSource<T, A extends unknown[], R, P, S>(
	kind: 0 | 1,
	source: BoundSourceType<T, A, R, P>,
	ownStartTransition: React.TransitionStartFunction,
	update: React.Dispatch<React.SetStateAction<UseAsyncReturn<T, A, R, P, S>>>
) {
	const subscription = {
		kind,
		update,
		flags: 0,
		start: ownStartTransition,
	};
}

type UseAsyncReturn<T, A extends unknown[], R, P, S> = {
	data?: T;
	error?: R;

	state: S;
	setError(error: R): void;
	setData(data: T | ((prev?: T) => T)): void;
};

function renderSource<T, A extends unknown[], R, P, S>(
	source: BoundSourceType<T, A, R, P>
) {
	const current = source.alternate ? source.alternate : createAlternate();
}

/**
 * The alternate type:
 * {
 *   root, // the configuration
 *   flags, // RENDERING, COMMITTED, SUSPENDING, ..
 *   retain, // starts retaining
 *   state,
 *   enqueueUpdate, //
 * }
 *
 *
 * The alternate source works as follows:
 * - All operations are performed on the alternate
 * - If no render is occurring, the operation is flushed right away and
 *   subscribers are notified immediately. Always notify in microTask or via
 *   setTimeout.
 * -
 *
 *
 *
 * render:
 * 1. lookup the bound source to use (from current context)
 * 2. initialize or take the alternate source
 *
 *
 *
 *
 *
 *
 */

const StateFiberPrototype = {
	constructor() {
		console.log("INSTANCE");
	},
	run() {
		console.log("Running !");
	},
	runc() {
		console.log("Runccing !");
	},
	setState() {
		console.log("set state");
	},
	// ...
};

function StateFiber() {}
StateFiber.prototype = Object.assign(
	{},
	Function.prototype,
	StateFiberPrototype
);

function theHook(config) {
	// will lookup the current execution context
	const context = useCurrentContext();
	// will lookup the bound source to use, aka: the piece of state
	const boundSource = lookupSource(context, config);

	const [state, setState] = useState();

	const subscription = useRetainSource(boundSource, config);
	render(boundSource, subscription, config);
}


/**
 * How will I do this ?
 * Here is the useAsyncHook work:
 *
 * 1. Detect environment: server or client, and call the right hook
 *    useClientAsync() and useServerAsync() or even, useRscAsync() ?
 *    Let's forget about RSCs for the rest of the story
 *
 * 2. useServerAsync()
 *    This is useAsync, but in the server.
 *    In the server, useAsync would require a parent AsyncContext wrapper if
 *    no context is provided.
 *    This is what it will do:
 *    - Lookup execution context
 *    - Detect the mode: standalone, shared, subscription, listen..
 *    - Get or create state by name
 *    - Detect and/or ensure state will get hydrated
 *    - Ensure state is populated given the options and suspend if needed
 *
 * 3. useClientAsync()
 *    This is useAsync, but in the browser/native/...
 *    This is how it will work:
 *    - Lookup execution context
 *    - Detect mode
 *    - Get or create state by name
 *    	+ If creation, boot from hydrated data if available
 *    - Share state if needed (not standalone... etc)
 *    - Initialize state subscription
 *    - Ensure state did boot
 *    	- If no "current" is present, eagerly create it
 *      - Suspend if async
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 */

const t = {
	id: 0,
	key: "t",
	version: 0,

	state: {
		data: 15,
		timestamp: 1,
		status: "initial",
	},

	actions: {
		setData: () => {},
		setError: () => {},
		setState: () => {},
		// and on on...
	},

	retainers: {
		"useState()[1]": {
			flags: 0,
		}
	},
}



type Fiber = {


	alternate: Fiber | null;
}
