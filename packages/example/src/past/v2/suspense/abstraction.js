import React from "react";
import {useAsyncState} from "react-async-states";

const Context = React.createContext(null);

export function useCurrentStateBoundary() {
  return React.useContext(Context);
}

export default function AsyncStateBoundary({ config, deps, fallback, children }) {
  const result = useAsyncState(config, deps);
  return (
    <Context.Provider value={result}>
      <React.Suspense fallback={fallback}>
        <Suspender reader={result.read} />
        {children}
      </React.Suspense>
    </Context.Provider>
  );
}

function Suspender({reader}) {
  reader();
  return null;
}
