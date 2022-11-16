import * as React from "react";

export const DevtoolsContext = React.createContext<DevtoolsContextType>({dev: true});
type DevtoolsContextType = { dev?: boolean };

export function DevtoolsProvider({
  dev,
  children
}: { dev: boolean, children: React.ReactNode }) {
  return (
    <DevtoolsContext.Provider
      value={React.useMemo(() => ({dev}), [dev])}
    >
      {children}
    </DevtoolsContext.Provider>
  )
}
