import React from "react";
import { useAsyncState } from "react-async-states";
import { demoAsyncStates } from "./Provider";

export default function Demo() {
  return (
    <div>
      <h3>Anonymous example</h3>
      <section><SourceExample /></section>
    </div>
  );
}

function SourceExample() {
  const {key, state: {status, data}, run, abort} = useAsyncState(demoAsyncStates.users);

  return (
    <div>
      <span>key: {key}</span><br />
      <span>status: {status}</span><br />
      <span><button onClick={() => run()}>Click me</button></span><br />
      <span><button onClick={() => abort()} disabled={status !== "pending"}>abort me</button></span><br />
      <span>data: {JSON.stringify(data, null, "  ")}</span><br />
      <hr />
      <NewDemo />
    </div>
  );
}

function NewDemo() {
  const {state, run, abort} = useAsyncState(function(props) {
    console.log('running', props.isAborted(), props.aborted);
    return new Promise(resolve => {
      const id = setTimeout(resolve, 3000);
      props.onAbort(function() {
        console.log('on abort callback', props.isAborted());
        clearTimeout(id);
      });
    });
  });


  return (
    <div>
      <button onClick={() => run()}>run</button>
      <button onClick={() => abort()}>abort</button>
      <span>status is: {state.status}</span>
    </div>
  );
}
