import * as React from "react";
import {MixedConfig, UseAsyncState,} from "../../../types.internal";
import {useAsyncState} from "../../../useAsyncState";
import {State} from "async-states";

const defaultDeps = [];

export default function AsyncStateComponent<T, E = any, R = any, A extends unknown[] = unknown[], S = State<T, E, R, A>>({
  config,
  children,
  dependencies = defaultDeps
}: {
  config: MixedConfig<T, E, R, A, S>,
  children: (props: UseAsyncState<T, E, R, A, S>) => React.ReactNode,
  dependencies?: any[],
}): any {
  if (typeof children !== "function") {
    throw new Error("AsyncStateComponent supports only render props.");
  }
  return children(useAsyncState(config, dependencies));
}
