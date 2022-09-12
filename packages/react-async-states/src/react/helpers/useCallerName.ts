import * as React from "react";
import {__DEV__} from "shared";
import AsyncState, {AsyncStateInterface} from "../../async-state";

const emptyArray = [];

function newObj() {
  return Object.create(Object.prototype);
}

type WarnInDevSelf<T> = {
  subId?: number,
  result?: string,
  subKey?: string,
  instance?: AsyncStateInterface<T>,
}

export default function useInDevSubscriptionKey<T>(
  subKey: string | undefined,
  asyncState: AsyncStateInterface<T>,
  from: string, // 1: useAsyncState, 2: useSourceLane, 3: useProducer, 4: useSelector
): string | undefined {
  if (__DEV__) {
    let callerName = useCallerName(5);
    let self = React.useRef<WarnInDevSelf<T>>();

    if (!self.current) {
      self.current = {};
    }

    const didKeyChange = self.current.subKey !== subKey;
    const didInstanceChange = self.current.instance !== asyncState;
    if (didKeyChange || didInstanceChange) {
      if (asyncState && !subKey) {
        let nextId = self.current.subId;

        if (didInstanceChange) {
          nextId = ++((asyncState as AsyncState<T>).subscriptionsMeter);
        }

        self.current = {
          subId: nextId,
          instance: asyncState,
          result: `${callerName}-$${from}-$${nextId}`,
        };
      } else {
        self.current = {
          result: subKey,
        };
      }
    }

    return self.current.result;
  }
}

export function useCallerName(level = 4): string | undefined {
  if (!__DEV__) {
    return;
  }

  // using a lightweight mutable memo there that s assigned only one time
  const self = React
    .useMemo<{ callerName: string | undefined }>(newObj, emptyArray);

  // assign only if not already assigned, even undefined counts!
  if (!Object.prototype.hasOwnProperty.call(self, "callerName")) {
    self.callerName = computeCallerName(level);
  }

  return self.callerName;
}

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

  return match?.[1]
}
