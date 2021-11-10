import React from "react";
import { AsyncStateContext } from "../context";

// returns a function that runs any async states by key in the provider, with args
export function useRunAsyncState() {
  return React.useContext(AsyncStateContext).runAsyncState;
}
