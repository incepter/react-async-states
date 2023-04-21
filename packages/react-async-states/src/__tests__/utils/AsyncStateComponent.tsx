import * as React from "react";
import {State} from "async-states";
import {MixedConfig, UseAsyncState} from "../../state-hook/types.internal";
import {useAsyncState} from "../../useAsyncState";

const defaultDeps = [];

export default function AsyncStateComponent<T, E = any, R = any, A extends unknown[] = unknown[], S = State<T, E, R, A>>({
  config,
  children,
  dependencies = defaultDeps
}: {
  config: MixedConfig<T, E, R, A, S>,
  children?: (props: UseAsyncState<T, E, R, A, S>) => React.ReactNode,
  dependencies?: any[],
}): any {
  if (children && typeof children !== "function") {
    throw new Error("AsyncStateComponent supports only render props.");
  }
  let result = useAsyncState(config, dependencies);
  if (!children) {
    return null
  }
  return children(result);
}
