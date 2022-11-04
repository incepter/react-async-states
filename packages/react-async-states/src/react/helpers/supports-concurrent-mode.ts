import * as React from "react";

export function supportsConcurrentMode(): boolean {
  // @ts-ignore
  return typeof React.useSyncExternalStore === "function";
}
