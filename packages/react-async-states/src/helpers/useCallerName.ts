import * as React from "react";
import { __DEV__ } from "../shared";

export function computeCallerName(level = 3): undefined | string {
  const stack = new Error().stack?.toString();
  if (!stack) {
    return undefined;
  }
  const regex = new RegExp(/at.(\w+).*$/, "gm");

  let levelsCount = 0;
  let match = regex.exec(stack);

  while (levelsCount < level && match) {
    match = regex.exec(stack);
    levelsCount += 1;
  }

  return match?.[1];
}

export function useCallerName(level: number): string | undefined {
  if (!__DEV__) {
    return undefined;
  }

  // Here, we are using useMemo like a useRef.
  // It is safe to read/write to it here during render, because it is a single
  // time computed information that will never change.
  // Why not using useMemo(() => computeCallerName(level), [level])
  // is because in this case we would have to deal with the call level from
  // inside React, which is unstable and isn't linked to the project.
  // To avoid that entirely, we force the computation of the caller here
  // in this hook so it won't leak further into React internals.
  // Using useMemo because it is lightweight.
  // Avoiding useRef so we won't have any warnings issues from a future
  // StrictMode or compiler thing.
  let ref = React.useMemo<{ current?: string }>(() => ({}), [level]);

  if (!ref.current) {
    ref.current = computeCallerName(level);
  }

  return ref.current;
}
