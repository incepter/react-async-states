import * as React from "react";
import { State } from "async-states";
import { useAsync } from "../../hooks/useAsync_export";
import { MixedConfig, UseAsyncState } from "../../hooks/types";

const defaultDeps = [];

export default function AsyncStateComponent<
  TData,
  E = any,
  A extends unknown[] = unknown[],
  S = State<TData, A, E>,
>({
  config,
  children,
  dependencies = defaultDeps,
}: {
  config: MixedConfig<TData, A, E, S>;
  children?: (props: UseAsyncState<TData, A, E, S>) => React.ReactNode;
  dependencies?: any[];
}): any {
  if (children && typeof children !== "function") {
    throw new Error("AsyncStateComponent supports only render props.");
  }
  let result = useAsync(config, dependencies);
  // console.log('hoho', {...result, source: null})
  if (!children) {
    return null;
  }
  return children(result);
}
