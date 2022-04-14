import * as React from "react";
import {
  AsyncStateSubscriptionMode,
  UseAsyncState,
  UseAsyncStateConfig
} from "../types.internal";
import {useAsyncState} from "../hooks/useAsyncState";
import {
  AsyncStateSource,
  AsyncStateStatus,
  RenderStrategy
} from "../async-state";
import {readAsyncStateFromSource} from "../async-state/read-source";

const defaultDeps = [];


interface ComponentSelf {
  didRenderChildren: boolean,
}

export function AsyncStateComponent<T, E>({
  config,
  error = null,
  suspend = false,
  children = null,
  fallback = null,
  dependencies = defaultDeps,
  strategy = RenderStrategy.FetchOnRender,
}: {
  suspend?: boolean,
  dependencies?: any[],
  strategy?: RenderStrategy,
  config: UseAsyncStateConfig<T, E>,
  error?: React.ReactNode | ((props) => React.ReactNode),
  children?: ((props: UseAsyncState<T, E>) => React.ReactNode) | null,
  fallback?: React.ReactNode | ((props: { state: E, abort: ((reason?: any) => void) }) => React.ReactNode),
}): any {
  const props = useAsyncState(config, dependencies);

  if (
    strategy === RenderStrategy.FetchThenRender &&
    props.mode !== AsyncStateSubscriptionMode.NOOP &&
    props.mode !== AsyncStateSubscriptionMode.WAITING
  ) {

    const asyncState = readAsyncStateFromSource(
      props.source as AsyncStateSource<T>
    );

    if (asyncState.currentState.status === AsyncStateStatus.pending) {
      if (suspend) {
        props.read(); // will throw
      }
      // the fallback will only see the pending status,
      // so it will receive only the state
      return render(fallback, {state: props.state, abort: props.abort});
    }

    if (asyncState.currentState.status === AsyncStateStatus.error) {
      console.log('here', props)
      return render(error, props);
    }

    if (asyncState.currentState.status !== AsyncStateStatus.success) {
      return render(fallback, props);
    }

    return render(children, props);
  }
  return render(children, props);
}

function render(create, props) {
  return typeof create === "function" ? React.createElement(create, props) : create;
}
