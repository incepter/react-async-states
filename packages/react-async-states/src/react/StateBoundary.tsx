import * as React from "react";
import {Status, State} from "../async-state";
import {
  MixedConfig, RenderStrategy,
  StateBoundaryProps,
  UseAsyncState, UseAsyncStateConfiguration,
} from "../types.internal";
import {useAsyncState} from "./useAsyncState";
import {emptyArray} from "./utils";

const StateBoundaryContext = React.createContext<any>(null);

export function StateBoundary<T, E>(props: StateBoundaryProps<T, E>) {
  return (
    <StateBoundaryImpl key={props.strategy} {...props}>
      {props.children}
    </StateBoundaryImpl>
  )
}

function StateBoundaryImpl<T, E>(props: StateBoundaryProps<T, E>) {
  if (props.strategy === RenderStrategy.FetchThenRender) {
    return React.createElement(FetchThenRenderBoundary, props);
  }
  if (props.strategy === RenderStrategy.FetchAsYouRender) {
    return React.createElement(FetchAsYouRenderBoundary, props);
  }
  return React.createElement(RenderThenFetchBoundary, props);
}

function inferBoundaryChildren<T, E = State<T>>(
  result: UseAsyncState<T, E>,
  props: StateBoundaryProps<T, E>
) {
  if (!props.render || !result.source) {
    return props.children;
  }

  const {status} = result.source.getState();

  return props.render[status] ? props.render[status] : props.children;
}

function renderChildren(children) {
  return typeof children === "function" ? React.createElement(children) : children;
}

export function RenderThenFetchBoundary<T, E>(props: StateBoundaryProps<T, E>) {
  const result = useAsyncState.auto(props.config, props.dependencies);

  const children = inferBoundaryChildren(result, props);

  return (
    <StateBoundaryContext.Provider value={result}>
      {renderChildren(children)}
    </StateBoundaryContext.Provider>
  );
}

export function FetchAsYouRenderBoundary<T, E>(props: StateBoundaryProps<T, E>) {
  const result = useAsyncState.auto(props.config, props.dependencies);
  result.read(); // throws
  const children = inferBoundaryChildren(result, props);
  return (
    <StateBoundaryContext.Provider value={result}>
      {renderChildren(children)}
    </StateBoundaryContext.Provider>
  );
}

function FetchThenRenderInitialBoundary<T, E>({
  dependencies = emptyArray, result, config
}: {dependencies?: any[], result: UseAsyncState<T, E>, config: MixedConfig<T, E>}) {

  result.source?.patchConfig({
    skipPendingStatus: true,
  });

  React.useEffect(() => {
    if ((config as UseAsyncStateConfiguration<T, E>).condition !== false) {
      const autoRunArgs = (config as UseAsyncStateConfiguration<T, E>).autoRunArgs;

      if (Array.isArray(autoRunArgs)) {
        return result.run(...autoRunArgs);
      }

      return result.run();
    }
  }, dependencies);

  return null;
}

export function FetchThenRenderBoundary<T, E>(props: StateBoundaryProps<T, E>) {
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
          {renderChildren(children)}
        </StateBoundaryContext.Provider>
      );
    }
  }
  return null;
}

export function useCurrentState<T, E = State<T>>(): UseAsyncState<T, E> {
  const ctxValue = React.useContext(StateBoundaryContext);

  if (ctxValue === null) {
    throw new Error('You cannot use useCurrentState outside a StateBoundary');
  }

  return ctxValue;
}
