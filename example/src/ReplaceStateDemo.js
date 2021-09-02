import React from "react";
import { useAsyncState } from "react-async-states";

function promise(argv) {
  return argv.payload.entry;
}

let meter = 0;

export default function Demo() {
  const {state, mergePayload, run} = useAsyncState({
    promise,
    key: "random",
    selector: d => d.data,
  });
  console.log("render", state)
  return <button onClick={() => {
    mergePayload({entry: ++meter});
    run();
  }}>This is a demo, {JSON.stringify(state)}</button>
}
