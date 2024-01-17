import * as React from "react";
import { LibraryContext, State } from "async-states";

export let Context = React.createContext<LibraryContext | null>(null);

export let maybeWindow = typeof window !== "undefined" ? window : undefined;
export let isServer =
  typeof maybeWindow === "undefined" || "Deno" in maybeWindow;

export type InternalProviderDomProps = {
  id: string;
  context: LibraryContext;
  children?: any;
};
export type InternalProviderServerProps = {
  id: string;
  context: LibraryContext;
  exclude?:
    | string
    | ((key: string, state: State<unknown, unknown[], unknown>) => boolean);
  children?: any;
};
