import * as React from "react";
import {
	MixedConfig,
	Source,
	State,
	Status,
	useAsync,
	useAsyncState,
	UseAsyncState,
	UseAsyncStateConfiguration,
} from "react-async-states";

let emptyArray = [];
function isFunction(fn) {
	return typeof fn === "function";
}

export type StateBoundaryProps<T, A extends unknown[], E, S> = {
	children: React.ReactNode;
	config: MixedConfig<T, A, E, S>;

	dependencies?: any[];
	strategy?: RenderStrategy;

	render?: StateBoundaryRenderProp;
};

export type StateBoundaryRenderProp = Record<Status, React.ReactNode>;

export type BoundaryContextValue<
	T,
	A extends unknown[] = unknown[],
	E = unknown,
	S = State<T, A, E>
> = BoundaryContext<T, A, E, S> | null;

export type BoundarySourceContextType = {
	source: Source<unknown, unknown[], unknown>;
	parent: BoundarySourceContextType | null;
};

export type BoundaryContext<
	T,
	A extends unknown[] = unknown[],
	E = unknown,
	S = State<T, A, E>
> = UseAsyncState<T, A, E, S>;

const StateBoundaryContext =
	React.createContext<BoundaryContextValue<any>>(null);

export function StateBoundary<T, A extends unknown[], E, S>(
	props: StateBoundaryProps<T, A, E, S>
) {
	return React.createElement(
		StateBoundaryImpl,
		Object.assign({ key: props.strategy }, props),
		props.children
	);
}

export enum RenderStrategy {
	FetchAsYouRender = 0,
	FetchThenRender = 1,
	RenderThenFetch = 2,
}

let BoundarySourceContext =
	React.createContext<BoundarySourceContextType | null>(null);

function BoundarySource<T, A extends unknown[], E>({
	source,
	children,
}: {
	source: Source<T, A, E>;
	children: any;
}) {
	let parentSource = React.useContext(BoundarySourceContext);
	let contextValue = React.useMemo(
		() => ({
			source,
			parent: parentSource,
		}),
		[source, parentSource]
	);

	return (
		<BoundarySourceContext.Provider value={contextValue}>
			{children}
		</BoundarySourceContext.Provider>
	);
}

function StateBoundaryImpl<T, A extends unknown[], E, S>(
	props: StateBoundaryProps<T, A, E, S>
) {
	if (props.strategy === RenderStrategy.FetchThenRender) {
		return React.createElement(FetchThenRenderBoundary, props);
	}
	if (props.strategy === RenderStrategy.FetchAsYouRender) {
		return React.createElement(FetchAsYouRenderBoundary, props);
	}
	return React.createElement(RenderThenFetchBoundary, props);
}

function inferBoundaryChildren<T, A extends unknown[], E, S = State<T, A, E>>(
	result: UseAsyncState<T, A, E, S>,
	props: StateBoundaryProps<T, A, E, S>
) {
	if (!props.render || !result.source) {
		return props.children;
	}

	const { status } = result.source.getState();

	return props.render[status] ? props.render[status] : props.children;
}

function renderChildren(children, props) {
	return isFunction(children) ? React.createElement(children, props) : children;
}

export function RenderThenFetchBoundary<T, A extends unknown[], E, S>(
	props: StateBoundaryProps<T, A, E, S>
) {
	let result = useAsyncState(props.config, props.dependencies);

	const children = inferBoundaryChildren(result, props);

	let Context = StateBoundaryContext as React.Context<
		BoundaryContextValue<T, A, E, S>
	>;
	return (
		<BoundarySource source={result.source!}>
			<Context.Provider value={result}>
				{renderChildren(children, result)}
			</Context.Provider>
		</BoundarySource>
	);
}

export function FetchAsYouRenderBoundary<T, A extends unknown[], E, S>(
	props: StateBoundaryProps<T, A, E, S>
) {
	let result = useAsyncState(props.config, props.dependencies);

	result.read(); // throws
	const children = inferBoundaryChildren(result, props);

	let Context = StateBoundaryContext as React.Context<
		BoundaryContextValue<T, A, E, S>
	>;
	return (
		<BoundarySource source={result.source!}>
			<Context.Provider value={result}>
				{renderChildren(children, result)}
			</Context.Provider>
		</BoundarySource>
	);
}

function FetchThenRenderInitialBoundary<T, A extends unknown[], E, S>({
	dependencies = emptyArray,
	result,
	config,
}: {
	dependencies?: any[];
	result: UseAsyncState<T, A, E, S>;
	config: MixedConfig<T, A, E, S>;
}) {
	result.source?.patchConfig({
		skipPendingStatus: true,
	});

	React.useEffect(() => {
		if (
			(config as UseAsyncStateConfiguration<T, A, E, S>).condition !== false
		) {
			const autoRunArgs = (config as UseAsyncStateConfiguration<T, A, E, S>)
				.autoRunArgs;

			if (Array.isArray(autoRunArgs)) {
				return result.source.run.apply(null, autoRunArgs);
			}

			return result.source.run.apply(null);
		}
	}, dependencies);

	return null;
}

export function FetchThenRenderBoundary<
	T,
	E = unknown,
	R = unknown,
	A extends unknown[] = unknown[],
	S = State<T, A, E>
>(props: StateBoundaryProps<T, A, E, S>) {
	let result = useAsyncState(props.config, props.dependencies);

	let Context = StateBoundaryContext as React.Context<
		BoundaryContextValue<T, A, E, S>
	>;
	switch (result.source?.getState().status) {
		case Status.pending:
		case Status.initial: {
			return (
				<FetchThenRenderInitialBoundary
					result={result}
					config={props.config}
					dependencies={props.dependencies}
				/>
			);
		}
		case Status.error:
		case Status.success: {
			const children = inferBoundaryChildren(result, props);
			return (
				<BoundarySource source={result.source}>
					<Context.Provider value={result}>
						{renderChildren(children, result)}
					</Context.Provider>
				</BoundarySource>
			);
		}
	}
	return null;
}

export function useCurrentState<
	T,
	A extends unknown[],
	E,
	S = State<T, A, E>
>(): UseAsyncState<T, A, E, S> {
	const ctxValue = React.useContext(
		StateBoundaryContext
	) as BoundaryContextValue<T, A, E, S>;

	if (ctxValue === null) {
		throw new Error("useCurrentState used outside StateBoundary");
	}

	return ctxValue;
}

function recursivelyTraverseContextAndGetSource<T, E, R, S>(
	ctxValue: BoundarySourceContextType,
	stateKey: string | undefined
) {
	if (!stateKey) {
		return ctxValue.source;
	}
	let currentSource = ctxValue.source;
	if (currentSource.key === stateKey) {
		return currentSource;
	}
	if (ctxValue.parent !== null) {
		return recursivelyTraverseContextAndGetSource(ctxValue.parent, stateKey);
	}
	throw new Error(`(${stateKey}) was not found in boundary tree`);
}

export function useBoundary<T, A extends unknown[] = [], E = Error>(
	stateKey?: string
): UseAsyncState<T, A, E> {
	const ctxValue = React.useContext(BoundarySourceContext);

	if (ctxValue === null) {
		throw new Error("useBoundary used outside StateBoundary");
	}

	let source = recursivelyTraverseContextAndGetSource(ctxValue, stateKey);

	return useAsync(source);
}
