import { HydrationData } from "../types";
import { isServer, maybeWindow } from "../utils";

let HYDRATION_DATA_KEY = "__ASYNC_STATES_HYDRATION_DATA__";

export const attemptHydratedState = isServer
  ? attemptHydratedStateServer
  : attemptHydratedStateDOM;

// unused parameters to keep the same exported signature
export function attemptHydratedStateServer<T, A extends unknown[], E>(
  _key: string
): HydrationData<T, A, E> | null {
  return null;
}

export function attemptHydratedStateDOM<T, A extends unknown[], E>(
  key: string
): HydrationData<T, A, E> | null {
  if (!maybeWindow || !maybeWindow[HYDRATION_DATA_KEY]) {
    return null;
  }

  let savedHydrationData = maybeWindow[HYDRATION_DATA_KEY];
  let name = `__INSTANCE__${key}`;
  let maybeState = savedHydrationData[name];

  if (!maybeState) {
    return null;
  }

  delete savedHydrationData[name];
  if (Object.keys(savedHydrationData).length === 0) {
    delete maybeWindow[HYDRATION_DATA_KEY];
  }

  return maybeState as HydrationData<T, A, E>;
}
