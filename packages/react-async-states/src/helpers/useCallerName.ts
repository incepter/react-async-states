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
  let ref = React.useRef<string>();
  if (!ref.current) {
    ref.current = computeCallerName(level);
  }
  return ref.current;
}
