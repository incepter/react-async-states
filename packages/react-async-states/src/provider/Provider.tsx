import * as React from "react";
import type { LibraryContext, SourceHydration } from "async-states";
import { createContext } from "async-states";
import { Context, isServer, ProviderProps } from "./context";

export default function Provider({
  children,
  context: contextArg,
}: Readonly<ProviderProps>) {
  // automatically reuse parent context when there is and no 'context' object
  // is provided
  let parentLibraryProvider = React.useContext(Context);

  // this object gets recomputed in the implementation providers, to avoid that
  // we reference it and pass it as prop
  let libraryContextObject: LibraryContext;
  if (parentLibraryProvider !== null && !contextArg) {
    libraryContextObject = parentLibraryProvider;
  } else {
    if (!contextArg && isServer) {
      contextArg = {};
    }
    libraryContextObject = createContext(contextArg ?? null);
  }

  // memoized children will unlock the React context children optimization:
  // if the children reference is the same as the previous render, it will
  // bail out and skip the children render and only propagates the context
  // change.
  return (
    <Context.Provider value={libraryContextObject}>{children}</Context.Provider>
  );
}

declare global {
  interface Window {
    __$$_HD?: Record<string, SourceHydration<any, any, any>>;
  }
}
