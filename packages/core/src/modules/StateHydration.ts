import { SourceHydration, StateInterface } from "../types";
import { isServer, maybeWindow } from "../utils";
import { initial } from "../enums";

let HYDRATION_DATA_KEY = "__$$";

export const attemptHydratedState = isServer
  ? attemptHydratedStateServer
  : attemptHydratedStateDOM;

// unused parameters to keep the same exported signature
export function attemptHydratedStateServer<
  TData,
  TArgs extends unknown[],
  TError,
>(
  _instance: StateInterface<TData, TArgs, TError>
): SourceHydration<TData, TArgs, TError> | null {
  return null;
}

export function attemptHydratedStateDOM<TData, TArgs extends unknown[], TError>(
  instance: StateInterface<TData, TArgs, TError>
): SourceHydration<TData, TArgs, TError> | null {
  if (!maybeWindow) {
    return null;
  }

  let { key, config, ctx } = instance;
  let contextName = ctx?.name ?? null;
  // why there are two possible keys ?
  // When coming from the server, sources there can be created from two ways:
  // globally via createSource, or locally via hooks.
  // either ways, the hydrated source belongs to a Provider's Context, which has
  // a name, so the hydrated data will come to the client with that key.
  // So, this source either has a context with a name (React.useId()) when
  // created initially inside a Provider, or else, we'll fallback to the
  // global context hydration in case the source wasn't created from inside
  // a Provider.
  let hydrationKey = HYDRATION_DATA_KEY;
  if (contextName !== null) {
    hydrationKey = contextName;
  }

  let savedHydrationData = maybeWindow[hydrationKey];
  if (!savedHydrationData) {
    return null;
  }

  let instanceHydration = savedHydrationData[key];

  if (!instanceHydration) {
    return null;
  }

  delete savedHydrationData[key];
  if (Object.keys(savedHydrationData).length === 0) {
    delete maybeWindow[hydrationKey];
  }

  let [state] = instanceHydration;
  let { status, props } = state;
  if (typeof state.data === "undefined") {
    state.data = undefined;
    if (status === initial && props.args[0] === null && !config.initialValue) {
      props.args[0] = undefined;
    }
  }
  return instanceHydration as SourceHydration<TData, TArgs, TError>;
}
