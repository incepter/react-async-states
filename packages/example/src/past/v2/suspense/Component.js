import React from "react";
import { useCurrentStateBoundary } from "./abstraction";

export default function Component() {
  const result = useCurrentStateBoundary();

  console.log('--component--result', result);
  return (
    <div>
      Im a component!!
    </div>
  )
}
