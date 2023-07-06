/**
 * This file will do drafting for the v2 usages
 */

export type Fn<T, A extends unknown[], R, P> = {
	(props: Props<T, A, R, P>): T | Promise<T>;
};

export interface GeneralStateConfig {}

export interface Config<T, A extends unknown[], R, P> extends GeneralStateConfig {
	initialValue?: T | Promise<T> | ((cache) => T | Promise<T>);
}

export interface BoundConfig<T, A extends unknown[], R, P> extends Config<T, A, R, P> {
	context?: any;
}

type Props<T, A extends unknown[], R, P> = {
	args: A;
	payload: P;
};

type InitialState<T> = {
	status: "initial";

	data?: T;
};

type PendingState<T, A extends unknown[], R, P> = {
	status: "pending";
	props: Props<T, A, R, P>;

	perv: {
		data?: T;
		error?: R;
	};
};

type SuccessState<T, A extends unknown[], R, P> = {
	status: "success";

	data: T;
	props: Props<T, A, R, P>;
};

type ErrorState<T, A extends unknown[], R, P> = {
	status: "error";

	error: R;
	props: Props<T, A, R, P>;
};
type State<T, A extends unknown[], R, P> =
	| InitialState<T>
	| PendingState<T, A, R, P>
	| SuccessState<T, A, R, P>
	| ErrorState<T, A, R, P>;

interface SourceRoot<T, A extends unknown[], R, P> {
	name: string;
	fn?: Fn<T, A, R, P>;
	config?: Config<T, A, R, P>;
}

const contexts = new Map<
	any,
	{ [name: string]: BoundSourceType<any, any, any, any> }
>();

export function getGlobalContextObject() {
	return null;
}

export function getSourceFromContext<T, A extends unknown[], R, P>(
	context: any,
	name: string
) {
	let contextSources = contexts.get(context);

	if (!contextSources) {
		contextSources = {};
		contexts.set(context, contextSources);
	}

	return contextSources[name] as BoundSourceType<T, A, R, P> | undefined;
}

function addSourceToContext(
	context: any,
	boundSource: BoundSourceType<any, any, any, any>
) {
	let contextSources = contexts.get(context);
	if (!contextSources) {
		contextSources = {};
		contexts.set(context, contextSources);
	}

	contextSources[boundSource.root.name] = boundSource;
}

function removeSourceFromContext(context: any, name: string) {
	let contextSources = contexts.get(context);
	if (!contextSources) {
		return false;
	}

	return delete contextSources[name];
}

type AbortFn = (reason?: any) => void;
export interface UnboundSourceType<T, A extends unknown[], R, P> {
	root: SourceRoot<T, A, R, P>; // the work definition
	src: BoundSource<T, A, R, P> | null;

	// hmm
	// methods: {
	run(...args: A): AbortFn;

	// replay(): AbortFn;
	// runp(...args: A): Promise<T>;
	// runc(props: RuncProps<T, A, R, P>): AbortFn;
	//
	// getPayload(): P;
	// mergePayload(partial: Partial<P>): P;
	//
	// setCache(): void; // clears cache
	// setCache(key: string): void; // overrides a cache entry
	// getCache(): WholeCachedState<T, A, R, P>; // returns the whole cache
	// getCache(key: string): CachedState<T, A, R, P>;
	//
	// getConfig(): Config<T, A, R, P>;
	// mergeConfig(partial: Partial<Config<T, A, R, P>>);
	//
	// setData(data: T);
	// setError(error: R);
	// getState(): State<T, A, R, P>;
	// setState(state: State<T, A, R, P>);
	//
	// subscribe(cb): () => void;
	// on(eventType, eventHandler): () => void;
	// }

	bind(context: any): BoundSourceType<T, A, R, P>;
}

export function createSource<T, A extends unknown[], R, P>(
	name: string,
	fn?: Fn<T, A, R, P>,
	config?: Config<T, A, R, P>
): UnboundSourceType<T, A, R, P> {
	return new UnboundSource({ name, fn, config });
}

export const boundSourceSymbol = Symbol.for("bound_async");
export const unboundSourceSymbol = Symbol.for("unbound_async");

class UnboundSource<T, A extends unknown[], R, P>
	implements UnboundSourceType<T, A, R, P>
{
	root: SourceRoot<T, A, R, P>;
	src: BoundSource<T, A, R, P> | null; // will refer to global 'null' context

	constructor(root: SourceRoot<T, A, R, P>) {
		this.src = null;
		this.root = root;

		this.run = this.run.bind(this);
		this.bind = this.bind.bind(this);

		this[unboundSourceSymbol] = true;
	}

	bind(context: any): BoundSourceType<T, A, R, P> {
		return new BoundSource(this.root, context);
	}

	run(...args: A): AbortFn {
		// fast path for global sources
		if (this.src) {
			return this.src.run.apply(null, args);
		}

		const root = this.root;
		const sourceToUse = (this.src = getDefaultContextSourceByName(root));

		return sourceToUse.run.apply(null, args);
	}
}

function getDefaultContextSourceByName<T, A extends unknown[], R, P>(
	root: SourceRoot<T, A, R, P>
) {
	let sourceToUse = getSourceFromContext<T, A, R, P>(null, root.name);

	if (!sourceToUse) {
		return new BoundSource(root, null);
	}

	return sourceToUse;
}

type SourceListenerObject = {
	flags?: number;
	clean: () => void;
	cb: (state) => void;
};
type SourceListeners = {
	[id: number]: SourceListenerObject;
};

export interface BoundSourceType<T, A extends unknown[], R, P>
	extends UnboundSourceType<T, A, R, P> {
	context: any;

	state: State<T, A, R, P>;

	flags: number;
	locks: number;
	subIndex: number;
	listeners: SourceListeners;
	subscribe(config: SubscriptionConfig): () => void;

	getState(): State<T, A, R, P>;
	setState(state: State<T, A, R, P>): void;

	alternate: BoundSourceType<T, A, R, P> | null;
}

type SubscriptionConfig =
	| {
			flags?: number;
			cb: (state) => void;
	  }
	| ((state) => void);

class BoundSource<T, A extends unknown[], R, P>
	extends UnboundSource<T, A, R, P>
	implements BoundSourceType<T, A, R, P>
{
	context: any;
	state: State<T, A, R, P>;

	flags: number;
	locks: number;
	subIndex: number;
	listeners: SourceListeners;
	alternate: BoundSourceType<T, A, R, P> | null;

	constructor(root: SourceRoot<T, A, R, P>, context: any) {
		super(root);
		const maybeSource = getSourceFromContext<T, A, R, P>(context, root.name);

		if (maybeSource) {
			// force reuse the same instance
			return maybeSource;
		}

		this.flags = 0;
		this.locks = 0;
		this.subIndex = 0;
		this.listeners = {};
		this.alternate = null;
		// todo: add data via initialValue
		let initialValue: T | undefined;
		if (root.config && (root.config.initialValue !== undefined)) {
			const initializer = root.config.initialValue;
			// todo: promise!
			if (typeof initializer !== "function") {
				// @ts-ignore
				initialValue = initializer;
			}
		}
		this.state = { status: "initial" };
		if (initialValue !== undefined) {
			this.state.data = initialValue;
		}

		this.run = this.run.bind(this);
		this.bind = this.bind.bind(this);
		this.getState = this.getState.bind(this);
		this.setState = this.setState.bind(this);
		this.subscribe = this.subscribe.bind(this);

		this[unboundSourceSymbol] = true;

		addSourceToContext(context, this);
	}

	run(...args: A): AbortFn {
		// todo: this is not the real run function
		// this is something that will entirely change
		const { fn } = this.root;
		if (fn) {
			// @ts-ignore
			const result = fn.apply(null, { args });
		}
		return () => {};
	}

	getState(): State<T, A, R, P> {
		return this.state;
	}

	// todo: subscriptions may target a specific status
	subscribe(options: SubscriptionConfig) {
		let flags;
		let cb: (state) => void;

		if (typeof options === "function") {
			cb = options;
		} else {
			cb = options.cb;
			flags = options.flags;
		}

		const instance = this;

		instance.locks += 1;
		const index = ++instance.subIndex;

		instance.listeners[index] = {
			cb,
			flags,
			clean,
		};

		function clean() {
			instance.locks -= 1;
			delete instance.listeners[index];
		}

		return clean;
	}

	setState(newState: State<T, A, R, P>) {
		// todo: this should not be like this; rather:
		// we should enqueue an update in an updateQueue, then either process the
		// whole queue, depending on many things, like whether we are rendering
		// and if the state has been already initialized...
		// The updateQueue is then processed in a common function:
		// processUpdateQueue(updateQueue, flags) which will either flush away
		// right now and notify watchers, or schedule it for later.
		this.state = newState;
		Object.values(this.listeners).forEach((listener) => listener.cb(newState));
	}
}

export function createBoundSource<T, A extends unknown[], R, P>(
	name: string,
	fn?: Fn<T, A, R, P>,
	config?: BoundConfig<T, A, R, P>
): BoundSourceType<T, A, R, P> {
	const context = (config && config.context) || null;
	return new BoundSource({ name, fn, config }, context);
}

export function commitAlternate<T, A extends unknown[], R, P>(
	source: BoundSourceType<T, A, R, P>,
) {
	const alternate = source.alternate;
	if (alternate === null) {
		return;
	}


}

