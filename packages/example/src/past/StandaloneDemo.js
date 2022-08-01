import React from "react";
import { useProducer, useAsyncState } from "react-async-states";
import { usersProducer } from "./producers";

export default function Demo() {
  return (
    <div>
      <h3>Anonymous example</h3>
      <section><SourceExample /></section>
    </div>
  );
}

function SourceExample() {
  const {key, state: {status, data}, run, abort} = useProducer(usersProducer);

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

let producer = function(props) {
  console.log('running', props.payload, ...props.args);
  return props.args[0];
};

function NewDemo() {
  const [userId, setUserId] = React.useState("0");
  const {state, run, abort, replay} = useAsyncState({producer, payload: {userId}}, [userId]);


  return (
    <div>
      <input onChange={e => setUserId(e.target.value)} value={userId} />

      <button onClick={() => run(userId)}>run</button>
      <button onClick={() => replay()}>replay</button>
      {state.status === "pending" && <button onClick={() => abort()}>abort</button>}
      <span>status is: {state.status}</span>
    </div>
  );
}
