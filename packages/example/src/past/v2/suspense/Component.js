import React from "react";
import { useCurrentStateBoundary } from "./abstraction";

export default function Component() {
  const result = useCurrentStateBoundary();

  console.log('--component--result', result);
  return (
    <div>
      Im a component!!
      <details open>
        <pre>
          {JSON.stringify(result, null, 4)}
        </pre>
      </details>
    </div>
  )
}
