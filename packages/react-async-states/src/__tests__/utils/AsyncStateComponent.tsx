import * as React from "react";
import { State } from "async-states";
import { useAsync } from "../../hooks/useAsync_export";
import { MixedConfig, UseAsyncState } from "../../hooks/types";

const defaultDeps = [];

export default function AsyncStateComponent<
  TData,
  TError = any,
  TArgs extends unknown[] = unknown[],
  S = State<TData, TArgs, TError>,
>({
  config,
  children,
  dependencies = defaultDeps,
}: {
  config: MixedConfig<TData, TArgs, TError, S>;
  children?: (props: UseAsyncState<TData, TArgs, TError, S>) => React.ReactNode;
  dependencies?: any[];
}): any {
  if (children && typeof children !== "function") {
    throw new Error("AsyncStateComponent supports only render props.");
  }
  let result = useAsync(config, dependencies);
  if (!children) {
    return null;
  }
  return children(result);
}
