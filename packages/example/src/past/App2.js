import React from "react";
import { useAsyncState } from "react-async-states";
import { demoAsyncStates } from "./Provider";

export default function App2() {
  const {state: {status,data}} = useAsyncState(demoAsyncStates.users);
  return (<div>
    <h1>This is a whole new react tree</h1>
    <details>
      status: {status}
      <pre>
        {JSON.stringify(data ?? {}, null, 2)}
      </pre>
    </details>
  </div>)
}
