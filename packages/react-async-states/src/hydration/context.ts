import * as React from "react";
import {requestContext,LibraryPoolsContext} from "async-states";

export let HydrationContext = React.createContext<any | null>(null);

export function useExecutionContext(): LibraryPoolsContext {
  let hydrationContext = React.useContext(HydrationContext);
  if (!hydrationContext && isServer) {
    throw new Error("HydrationContext not found in the server.");
  }
  if (!hydrationContext) {
    return requestContext(null);
  }

  return requestContext(hydrationContext);
}

export let maybeWindow = typeof window !== "undefined" ? window : undefined;
export let isServer = !maybeWindow || !maybeWindow.document || !maybeWindow.document.createComment;
