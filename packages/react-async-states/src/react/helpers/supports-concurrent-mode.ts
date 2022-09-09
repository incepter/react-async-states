import * as React from "react";
import {isFn} from "../../../../shared";

export function supportsConcurrentMode(): boolean {
  // @ts-ignore
  return isFn(React.useSyncExternalStore);
}
