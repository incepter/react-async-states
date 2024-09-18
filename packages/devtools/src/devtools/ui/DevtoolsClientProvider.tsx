import * as React from "react";
import { NpmDevtoolsAgent, NpmLibraryDevtoolsClient } from "../NpmDevtoolsClient";

export type DevtoolsContext = NpmDevtoolsAgent;
export let devtoolsContext = React.createContext<DevtoolsContext | null>(null);

export function DevtoolsClientProvider({ children }) {
  let [devtools] = React.useState(() => new NpmLibraryDevtoolsClient());

  React.useEffect(() => {
    devtools.connect();

    return () => devtools.disconnect();
  }, [devtools]);

  return (
    <devtoolsContext.Provider value={devtools}>
      {children}
    </devtoolsContext.Provider>
  );
}

export function useDevtoolsAgent() {
  let agent = React.useContext(devtoolsContext);
  if (!agent) {
    throw new Error("Could not find devtools agent.");
  }
  return agent;
}
