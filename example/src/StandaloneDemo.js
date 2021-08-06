import React from "react";
import { useAsyncState } from "react-async-states";
import { demoAsyncStates } from "./Provider";

export default function Demo() {
  return (
    <div>
      <h3>Anonymous example</h3>
      <section><AnonymousExample /></section>
    </div>
  );
}

function AnonymousExample() {
  const {key, state: {status, data}, run, abort} = useAsyncState(demoAsyncStates.users.promise);

  return (
    <div>
      <span>key: {key}</span><br />
      <span>status: {status}</span><br />
      <span><button onClick={run}>Click me</button></span><br />
      <span><button onClick={abort} disabled={status !== "loading"}>abort me</button></span><br />
      <span>data: {JSON.stringify(data, null, "  ")}</span><br />
    </div>
  );
}
