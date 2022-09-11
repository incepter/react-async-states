import * as React from "react";
import {__DEV__} from "shared";
import AsyncState, {AsyncStateInterface} from "../../async-state";

const emptyArray=[];
function newObj() {
  return Object.create(null);
}

export default function useInDevSubscriptionKey<T>(
  subKey: string | undefined,
  asyncState: AsyncStateInterface<T>
): string | undefined {
  if (__DEV__) {
    if (asyncState && !subKey) {
      let uniqueId = React.useRef<number>();
      if (!uniqueId.current) {
        uniqueId.current = ++((asyncState as AsyncState<T>).subscriptionsMeter);
      }

      return `${useCallerName(5)}-$${uniqueId.current}`;
    }
  }
}

export function useCallerName(level = 4): string | undefined {
  if (!__DEV__) {
    return;
  }

  const self = React
    .useMemo<{callerName: string | undefined}>(newObj, emptyArray);

  if (!self.callerName) {
    self.callerName = computeCallerName(level);
  }

  return self.callerName;
}

function computeCallerName(level = 3): undefined | string {
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

  return match?.[1]
}
