import * as React from "react";
import {State, requestContext,LibraryPoolsContext} from "async-states";

export let HydrationContext = React.createContext<any | null>(null);

export function useExecutionContext(probablyContext?: any): LibraryPoolsContext {
  let currentHydrationContext = React.useContext(HydrationContext);

  if (probablyContext) {
    return probablyContext
  }

  if (!currentHydrationContext && isServer) {
    throw new Error("HydrationContext not found in the server.");
  }

  if (!currentHydrationContext) {
    return requestContext(null);
  }

  return requestContext(currentHydrationContext);
}

export let maybeWindow = typeof window !== "undefined" ? window : undefined;
export let isServer = !maybeWindow || !maybeWindow.document || !maybeWindow.document.createComment;

export type HydrationProps = {
  id: string,
  context: any,
  exclude?: string | ((key: string, state: State<unknown, unknown, unknown, unknown[]>) => boolean),
  children?: any,
}
