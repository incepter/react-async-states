/**
 * This file will do drafting for the v2 usages
 */

type Fn<T, A extends unknown[], R, P> = {
	(props: Props<T, A, R, P>): T | Promise<T>;
};

interface Config<T, A extends unknown[], R, P> {
	initialValue?: T | Promise<T> | ((cache) => T | Promise<T>);
}

interface BoundConfig<T, A extends unknown[], R, P> extends Config<T, A, R, P> {
	context?: any;
}

type Props<T, A extends unknown[], R, P> = {
	args: A;
	payload: P;
};

type InitialState<T, A extends unknown[], R, P> = {
	status: "initial";

	data?: T;
};

type PendingState<T, A extends unknown[], R, P> = {
	status: "pending";
	props: Props<T, A, R, P>;

	data?: T;
	error?: R;
};

type FulfilledState<T, A extends unknown[], R, P> = {
	status: "fulfilled";

	data: T;
	props: Props<T, A, R, P>;
};

type RejectedState<T, A extends unknown[], R, P> = {
	status: "rejected";

	error: R;
	props: Props<T, A, R, P>;
};

interface SourceRoot<T, A extends unknown[], R, P> {
	name: string;
	fn?: Fn<T, A, R, P>;
	config?: Config<T, A, R, P>;
}

const contexts = new Map<
	any,
	{ [name: string]: BoundSourceType<any, any, any, any> }
>();

function getSourceFromContext(context: any, name: string) {
	let contextSources = contexts.get(context);
	if (!contextSources) {
		contextSources = {};
		contexts.set(context, contextSources);
	}

	return contextSources[name];
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
interface UnboundSourceType<T, A extends unknown[], R, P> {
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

interface BoundSourceType<T, A extends unknown[], R, P>
	extends UnboundSourceType<T, A, R, P> {
	context: any;
}

export function createSource<T, A extends unknown[], R, P>(
	name: string,
	fn?: Fn<T, A, R, P>,
	config?: Config<T, A, R, P>
): UnboundSourceType<T, A, R, P> {
	return new UnboundSource({ name, fn, config });
}

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
		const sourceToUse = this.src = getDefaultContextSourceByName(root);

		return sourceToUse.run.apply(null, args);
	}
}

function getDefaultContextSourceByName(root: SourceRoot<any, any, any, any>) {
	let sourceToUse = getSourceFromContext(null, root.name);

	if (!sourceToUse) {
		return new BoundSource(root, null);
	}

	return sourceToUse;
}

class BoundSource<T, A extends unknown[], R, P>
	extends UnboundSource<T, A, R, P>
	implements BoundSourceType<T, A, R, P>
{
	context: any;

	constructor(root: SourceRoot<T, A, R, P>, context: any) {
		super(root);
		const maybeSource = getSourceFromContext(context, root.name) as
			| BoundSource<T, A, R, P>
			| undefined;

		if (maybeSource) {
			// force reuse the same instance
			return maybeSource;
		}

		this.run = this.run.bind(this);
		this.bind = this.bind.bind(this);

		addSourceToContext(context, this);
	}

	run(...args: A): AbortFn {
		const {fn} = this.root;
		if (fn) {
			// @ts-ignore
			const result = fn.apply(null, {args});
		}
		return () => {};
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
