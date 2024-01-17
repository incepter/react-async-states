import { ProducerConfig, SourceHydration } from "../types";
import { isServer, maybeWindow } from "../utils";
import { initial } from "../enums";

let HYDRATION_DATA_KEY = "__$$_HD";

export const attemptHydratedState = isServer
  ? attemptHydratedStateServer
  : attemptHydratedStateDOM;

// unused parameters to keep the same exported signature
export function attemptHydratedStateServer<
  TData,
  TArgs extends unknown[],
  TError,
>(
  _key: string,
  _config: ProducerConfig<TData, TArgs, TError>
): SourceHydration<TData, TArgs, TError> | null {
  return null;
}

export function attemptHydratedStateDOM<TData, TArgs extends unknown[], TError>(
  key: string,
  config: ProducerConfig<TData, TArgs, TError>
): SourceHydration<TData, TArgs, TError> | null {
  if (!maybeWindow?.[HYDRATION_DATA_KEY]) {
    return null;
  }

  let savedHydrationData = maybeWindow[HYDRATION_DATA_KEY];
  let maybeHydration = savedHydrationData[key];

  if (!maybeHydration) {
    return null;
  }

  delete savedHydrationData[key];
  if (Object.keys(savedHydrationData).length === 0) {
    delete maybeWindow[HYDRATION_DATA_KEY];
  }

  let [state] = maybeHydration;
  let { status, props } = state;
  if (typeof state.data === "undefined") {
    state.data = undefined;
    if (status === initial && props.args[0] === null && !config.initialValue) {
      props.args[0] = undefined;
    }
  }
  return maybeHydration as SourceHydration<TData, TArgs, TError>;
}
