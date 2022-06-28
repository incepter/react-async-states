import * as React from "react";
import {
  AsyncStateSource,
  AsyncStateStatus,
  RenderStrategy,
  State
} from "../async-state";
import {
  AsyncStateSubscriptionMode, StateBoundaryProps,
  UseAsyncState,
  UseAsyncStateConfig
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
    return render(FetchThenRenderBoundary, props);
  }
  if (props.strategy === RenderStrategy.FetchAsYouRender) {
    return render(FetchAsYouRenderBoundary, props);
  }
  return render(RenderThenFetchBoundary, props);
}

export function RenderThenFetchBoundary<T, E>(props: StateBoundaryProps<T, E>) {
  const result = useAsyncState(props.config, props.dependencies);

  return (
    <StateBoundaryContext.Provider value={result}>
      {props.children}
    </StateBoundaryContext.Provider>
  );
}

export function FetchAsYouRenderBoundary<T, E>(props: StateBoundaryProps<T, E>) {
  const result = useAsyncState.auto(props.config, props.dependencies);
  result.read(); // throws
  return (
    <StateBoundaryContext.Provider value={result}>
      {props.children}
    </StateBoundaryContext.Provider>
  );
}

function render(create, props) {
  return typeof create === "function" ? React.createElement(create, props) : create;
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

    const {currentState: {status}} = asyncState;

    if (status === AsyncStateStatus.error || status === AsyncStateStatus.success) {
      self.didLoad = true;
      return (
        <StateBoundaryContext.Provider value={result}>
          {props.children}
        </StateBoundaryContext.Provider>
      );
    }

    return null;
  }

  return (
    <StateBoundaryContext.Provider value={result}>
      {props.children}
    </StateBoundaryContext.Provider>
  );

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
