import * as React from "react";
import {createContext,} from "async-states";
import {HydrationContext, HydrationProps, isServer,} from "./context";
import HydrationServer from "./HydrationServer";
import HydrationDom from "./HydrationDom";

export default function Hydration({
  context,
  exclude,
  children
}: HydrationProps) {
  createContext(context);
  return (
    <HydrationContext.Provider value={context}>
      {children}
      {!isServer && <HydrationDom context={context}/>}
      {isServer && <HydrationServer context={context} exclude={exclude}/>}
    </HydrationContext.Provider>
  );
}

