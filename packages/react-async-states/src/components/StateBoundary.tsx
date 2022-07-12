import * as React from "react";
import {
  AsyncStateSource,
  AsyncStateStatus,
  RenderStrategy,
  State
} from "../async-state";
import {
  AsyncStateSubscriptionMode,
  StateBoundaryProps,
  UseAsyncState,
} from "../types.internal";
import {useAsyncState} from "../hooks/useAsyncState";
import {readAsyncStateFromSource} from "../async-state/read-source";

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

  const asyncState = readAsyncStateFromSource(result.source);
  const {status} = asyncState.currentState;

  return props.render[status] ? props.render[status] : props.children;
}

export function RenderThenFetchBoundary<T, E>(props: StateBoundaryProps<T, E>) {
  const result = useAsyncState(props.config, props.dependencies);

  const children = inferBoundaryChildren(result, props);
  return (
    <StateBoundaryContext.Provider value={result}>
      {children}
    </StateBoundaryContext.Provider>
  );
}

export function FetchAsYouRenderBoundary<T, E>(props: StateBoundaryProps<T, E>) {
  const result = useAsyncState.auto(props.config, props.dependencies);
  result.read(); // throws
  const children = inferBoundaryChildren(result, props);
  return (
    <StateBoundaryContext.Provider value={result}>
      {children}
    </StateBoundaryContext.Provider>
  );
}

type FetchThenRenderSelf = {
  didLoad: boolean,
}

export function FetchThenRenderBoundary<T, E>(props: StateBoundaryProps<T, E>) {
  const result = useAsyncState.auto(props.config, props.dependencies);
  const self = React.useMemo<FetchThenRenderSelf>(constructSelf, []);

  if (result.mode === AsyncStateSubscriptionMode.NOOP ||
    result.mode === AsyncStateSubscriptionMode.WAITING) {
    throw new Error("FetchThenRenderBoundary is not supported with NOOP and WAITING modes");
  }

  if (!self.didLoad) {
    const {source} = result;
    const asyncState = readAsyncStateFromSource(source as AsyncStateSource<T>);

    const {status} = asyncState.currentState;

    if (status === AsyncStateStatus.error || status === AsyncStateStatus.success) {
      self.didLoad = true;
      const children = inferBoundaryChildren(result, props);
      return (
        <StateBoundaryContext.Provider value={result}>
          {children}
        </StateBoundaryContext.Provider>
      );
    }

    return null;
  } else {
    const children = inferBoundaryChildren(result, props);
    return (
      <StateBoundaryContext.Provider value={result}>
        {children}
      </StateBoundaryContext.Provider>
    );
  }

  function constructSelf() {
    return {
      didLoad: false,
    };
  }
}

export function useCurrentState<T, E = State<T>>(): UseAsyncState<T, E> {
  const ctxValue = React.useContext(StateBoundaryContext);

  if (ctxValue === null) {
    throw new Error('You cannot use useCurrentState outside a StateBoundary');
  }

  return ctxValue;
}
