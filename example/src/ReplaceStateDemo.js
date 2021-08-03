import React from "react";
import { useAsyncState } from "react-async-states";

export default function Demo() {
  const {state} = useAsyncState();
  return <span>This is a demo, {JSON.stringify(state)}</span>
}
