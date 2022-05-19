import React from "react";
import { Outlet } from "react-router-dom";
import { useCurrentStateBoundary } from "./abstraction";

export default function Component({name}) {
  const result = useCurrentStateBoundary();

  console.log('--component--result', result);
  return (
    <div style={{ display: "flex"}}>
      Im a component!!
      <details open>
        <pre>
          {JSON.stringify({name, result}, null, 4)}
        </pre>
      </details>

      OUTLET:
      <Outlet />
    </div>
  )
}
