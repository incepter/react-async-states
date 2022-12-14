import * as React from "react";
import {State, Status} from "../async-state";
import {
  MixedConfig,
  StateBoundaryProps,
  UseAsyncState,
  UseAsyncStateConfiguration,
} from "../types.internal";
import {useAsyncState} from "./useAsyncState";
import {emptyArray, isFunction} from "../shared";

const StateBoundaryContext = React.createContext<any>(null);

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
  const result = useAsyncState.auto(props.config, props.dependencies);

  const children = inferBoundaryChildren(result, props);

  return (
    <StateBoundaryContext.Provider value={result}>
      {renderChildren(children, result)}
    </StateBoundaryContext.Provider>
  );
}

export function FetchAsYouRenderBoundary<T, E, R, S>(props: StateBoundaryProps<T, E, R, S>) {
  const result = useAsyncState.auto(props.config, props.dependencies);
  result.read(); // throws
  const children = inferBoundaryChildren(result, props);
  return (
    <StateBoundaryContext.Provider value={result}>
      {renderChildren(children, result)}
    </StateBoundaryContext.Provider>
  );
}

function FetchThenRenderInitialBoundary<T, E, R, S>({
  dependencies = emptyArray, result, config
}: {dependencies?: any[], result: UseAsyncState<T, E, R, S>, config: MixedConfig<T, E, R, S>}) {

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

export function FetchThenRenderBoundary<T, E, R, S>(props: StateBoundaryProps<T, E, R, S>) {
  const result = useAsyncState(props.config, props.dependencies);

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
        <StateBoundaryContext.Provider value={result}>
          {renderChildren(children, result)}
        </StateBoundaryContext.Provider>
      );
    }
  }
  return null;
}

export function useCurrentState<T, E, R, S = State<T, E, R>>(): UseAsyncState<T, E, R, S> {
  const ctxValue = React.useContext(StateBoundaryContext);

  if (ctxValue === null) {
    throw new Error('useCurrentState used outside StateBoundary');
  }

  return ctxValue;
}
