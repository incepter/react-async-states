import React from "react";

export function isConcurrentMode() {
  return typeof React.useSyncExternalStore === "function";
}
