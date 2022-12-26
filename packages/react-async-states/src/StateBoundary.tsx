import * as React from "react";
import {Source, State, Status} from "@core";
import {
  MixedConfig,
  StateBoundaryProps,
  UseAsyncState,
  UseAsyncStateConfiguration,
} from "./types.internal";
import {useAsyncState} from "./useAsyncState";
import {emptyArray, isFunction} from "./shared";
import {useSource} from "./useSource";


type BoundaryContextValue<T, E = any, R = any, S = State<T, E, R>> =
  BoundaryContext<T, E, R, S>
  | null;

type BoundarySourceContextType = {
  source: Source<any>,
  parent: BoundarySourceContextType | null
}

type BoundaryContext<T, E = any, R = any, S = State<T, E, R>> = UseAsyncState<T, E, R, S>;

const StateBoundaryContext = React.createContext<BoundaryContextValue<any>>(null);

export function StateBoundary<T, E, R, S>(props: StateBoundaryProps<T, E, R, S>) {
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

function BoundarySource<T, E, R>({
  source,
  children
}: { source: Source<T, E, R>, children: any }) {
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

function StateBoundaryImpl<T, E, R, S>(props: StateBoundaryProps<T, E, R, S>) {
  if (props.strategy === RenderStrategy.FetchThenRender) {
    return React.createElement(FetchThenRenderBoundary, props);
  }
  if (props.strategy === RenderStrategy.FetchAsYouRender) {
    return React.createElement(FetchAsYouRenderBoundary, props);
  }
  return React.createElement(RenderThenFetchBoundary, props);
}

function inferBoundaryChildren<T, E, R, S = State<T, E, R>>(
  result: UseAsyncState<T, E, R, S>,
  props: StateBoundaryProps<T, E, R, S>
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

export function RenderThenFetchBoundary<T, E, R, S>(props: StateBoundaryProps<T, E, R, S>) {
  let result = useAsyncState(props.config, props.dependencies);

  const children = inferBoundaryChildren(result, props);

  let Context = (StateBoundaryContext as React.Context<BoundaryContextValue<T, E, R, S>>);
  return (
    <BoundarySource source={result.source!}>
      <Context.Provider value={result}>
        {renderChildren(children, result)}
      </Context.Provider>
    </BoundarySource>
  );
}

export function FetchAsYouRenderBoundary<T, E, R, S>(props: StateBoundaryProps<T, E, R, S>) {
  let result = useAsyncState(props.config, props.dependencies);

  result.read(); // throws
  const children = inferBoundaryChildren(result, props);

  let Context = (StateBoundaryContext as React.Context<BoundaryContextValue<T, E, R, S>>);
  return (
    <BoundarySource source={result.source!}>
      <Context.Provider value={result}>
        {renderChildren(children, result)}
      </Context.Provider>
    </BoundarySource>
  );
}

function FetchThenRenderInitialBoundary<T, E, R, S>({
  dependencies = emptyArray, result, config
}: { dependencies?: any[], result: UseAsyncState<T, E, R, S>, config: MixedConfig<T, E, R, S> }) {

  result.source?.patchConfig({
    skipPendingStatus: true,
  });

  React.useEffect(() => {
    if ((config as UseAsyncStateConfiguration<T, E, R, S>).condition !== false) {
      const autoRunArgs = (config as UseAsyncStateConfiguration<T, E, R, S>).autoRunArgs;

      if (Array.isArray(autoRunArgs)) {
        return result.run.apply(null, autoRunArgs);
      }

      return result.run();
    }
  }, dependencies);

  return null;
}

export function FetchThenRenderBoundary<T, E = any, R = any, S = State<T>>(props: StateBoundaryProps<T, E, R, S>) {
  let result = useAsyncState(props.config, props.dependencies);

  let Context = (StateBoundaryContext as React.Context<BoundaryContextValue<T, E, R, S>>);
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

export function useCurrentState<T, E, R, S = State<T, E, R>>(): UseAsyncState<T, E, R, S> {
  const ctxValue = React.useContext(StateBoundaryContext) as BoundaryContextValue<T, E, R, S>;

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
