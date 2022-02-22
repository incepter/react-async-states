import * as React from "react";
import {UseAsyncStateConfig} from "../../../types.internal";
import {useAsyncState} from "../../../hooks/useAsyncState";

const defaultDeps = [];

export default function AsyncStateComponent<T, E>({
  config,
  children,
  dependencies = defaultDeps
}: {
  config: UseAsyncStateConfig<T, E>,
  children: React.ReactNode,
  dependencies?: any[],
}): React.ReactNode {
  if (typeof children !== "function") {
    throw new Error("AsyncStateComponent supports only render props.");
  }
  return children(useAsyncState(config, dependencies));
}
