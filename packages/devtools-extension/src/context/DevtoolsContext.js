import React from "react";
import DevtoolsViewTypes from "../domain/DevtoolsViewTypes";

export const DevtoolsContext = React.createContext(null);

export function useDevtoolsContext() {
  return React.useContext(DevtoolsContext);
}

export function DevtoolsContextProvider({children}) {
  const currentViewState = React.useState(DevtoolsViewTypes.overview);
  return (
    <DevtoolsContext.Provider value={currentViewState}>
      {children}
    </DevtoolsContext.Provider>
  );
}
