import * as React from "react";
import { AsyncStateContext } from "../context";

// returns a function that runs any async states by key in the provider, with args
export function useRunAsyncState() {
  // @ts-ignore
  // todo: im tired
  return React.useContext(AsyncStateContext).runAsyncState;
}
