import * as React from "react";
import {
  Source, State, Status,
  MixedConfig,
  UseAsyncState,
  UseAsyncStateConfiguration,
  useAsyncState,
  useSource,
} from "react-async-states";

let emptyArray = [];
function isFunction(fn) {
  return typeof fn === "function";
}


export type StateBoundaryProps<T, E, R, A extends unknown[], S> = {
  children: React.ReactNode,
  config: MixedConfig<T, E, R, A, S>,

  dependencies?: any[],
  strategy?: RenderStrategy,

  render?: StateBoundaryRenderProp,
}

export type StateBoundaryRenderProp = Record<Status, React.ReactNode>


export type BoundaryContextValue<T, E = unknown, R = unknown, A extends unknown[] = unknown[], S = State<T, E, R, A>> =
  BoundaryContext<T, E, R, A, S>
  | null;

export type BoundarySourceContextType = {
  source: Source<unknown, unknown, unknown, unknown[]>,
  parent: BoundarySourceContextType | null
}

export type BoundaryContext<T, E = unknown, R = unknown, A extends unknown[] = unknown[], S = State<T, E, R, A>> = UseAsyncState<T, E, R, A, S>;

const StateBoundaryContext = React.createContext<BoundaryContextValue<any>>(null);

export function StateBoundary<T, E, R, A extends unknown[], S>(props: StateBoundaryProps<T, E, R, A, S>) {
  return React.createElement(
    StateBoundaryImpl,
    Object.assign({key: props.strategy}, props),
    props.children
  );
}

export enum RenderStrategy {
  FetchAsYouRender = 0,
  FetchThenRender = 1,
  RenderThenFetch = 2,
}


let BoundarySourceContext = React.createContext<BoundarySourceContextType | null>(null);

function BoundarySource<T, E, R, A extends unknown[]>({
  source,
  children
}: { source: Source<T, E, R, A>, children: any }) {
  let parentSource = React.useContext(BoundarySourceContext);
  let contextValue = React.useMemo(() => ({
    source,
    parent: parentSource,
  }), [source, parentSource]);

  return (
    <BoundarySourceContext.Provider value={contextValue}>
      {children}
    </BoundarySourceContext.Provider>
  )
}

function StateBoundaryImpl<T, E, R, A extends unknown[], S>(props: StateBoundaryProps<T, E, R, A, S>) {
  if (props.strategy === RenderStrategy.FetchThenRender) {
    return React.createElement(FetchThenRenderBoundary, props);
  }
  if (props.strategy === RenderStrategy.FetchAsYouRender) {
    return React.createElement(FetchAsYouRenderBoundary, props);
  }
  return React.createElement(RenderThenFetchBoundary, props);
}

function inferBoundaryChildren<T, E, R, A extends unknown[], S = State<T, E, R, A>>(
  result: UseAsyncState<T, E, R, A, S>,
  props: StateBoundaryProps<T, E, R, A, S>
) {
  if (!props.render || !result.source) {
    return props.children;
  }

  const {status} = result.source.getState();

  return props.render[status] ? props.render[status] : props.children;
}

function renderChildren(children, props) {
  return isFunction(children) ? React.createElement(children, props) : children;
}

export function RenderThenFetchBoundary<T, E, R, A extends unknown[], S>(props: StateBoundaryProps<T, E, R, A, S>) {
  let result = useAsyncState(props.config, props.dependencies);

  const children = inferBoundaryChildren(result, props);

  let Context = (StateBoundaryContext as React.Context<BoundaryContextValue<T, E, R, A, S>>);
  return (
    <BoundarySource source={result.source!}>
      <Context.Provider value={result}>
        {renderChildren(children, result)}
      </Context.Provider>
    </BoundarySource>
  );
}

export function FetchAsYouRenderBoundary<T, E, R, A extends unknown[], S>(props: StateBoundaryProps<T, E, R, A, S>) {
  let result = useAsyncState(props.config, props.dependencies);

  result.read(); // throws
  const children = inferBoundaryChildren(result, props);

  let Context = (StateBoundaryContext as React.Context<BoundaryContextValue<T, E, R, A, S>>);
  return (
    <BoundarySource source={result.source!}>
      <Context.Provider value={result}>
        {renderChildren(children, result)}
      </Context.Provider>
    </BoundarySource>
  );
}

function FetchThenRenderInitialBoundary<T, E, R, A extends unknown[], S>({
  dependencies = emptyArray, result, config
}: { dependencies?: any[], result: UseAsyncState<T, E, R, A, S>, config: MixedConfig<T, E, R, A, S> }) {

  result.source?.patchConfig({
    skipPendingStatus: true,
  });

  React.useEffect(() => {
    if ((config as UseAsyncStateConfiguration<T, E, R, A, S>).condition !== false) {
      const autoRunArgs = (config as UseAsyncStateConfiguration<T, E, R, A, S>).autoRunArgs;

      if (Array.isArray(autoRunArgs)) {
        return result.run.apply(null, autoRunArgs);
      }

      return result.run.apply(null);
    }
  }, dependencies);

  return null;
}

export function FetchThenRenderBoundary<T, E = unknown, R = unknown, A extends unknown[] = unknown[], S = State<T, E, R, A>>(props: StateBoundaryProps<T, E, R, A, S>) {
  let result = useAsyncState(props.config, props.dependencies);

  let Context = (StateBoundaryContext as React.Context<BoundaryContextValue<T, E, R, A, S>>);
  switch (result.source?.getState().status) {
    case Status.pending:
    case Status.aborted:
    case Status.initial: {
      return <FetchThenRenderInitialBoundary
        result={result}
        config={props.config}
        dependencies={props.dependencies}
      />;
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

export function useCurrentState<T, E, R, A extends unknown[], S = State<T, E, R, A>>(): UseAsyncState<T, E, R, A, S> {
  const ctxValue = React.useContext(StateBoundaryContext) as BoundaryContextValue<T, E, R, A, S>;

  if (ctxValue === null) {
    throw new Error('useCurrentState used outside StateBoundary');
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

export function useBoundary<T, E = any, R = any>(
  stateKey?: string
): UseAsyncState<T, E, R> {
  const ctxValue = React.useContext(BoundarySourceContext);

  if (ctxValue === null) {
    throw new Error('useBoundary used outside StateBoundary');
  }

  let source = recursivelyTraverseContextAndGetSource(ctxValue, stateKey);

  return useSource(source);
}
