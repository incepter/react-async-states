import React from "react";
import { useAsyncState } from "react-async-states";

function producerA(props) {
  const {userId} = props.payload;
  console.log('producerA is running', userId, props);
  return props.runp(producerB, null, userId).then(t => t.data);
}

function producerB(props) {
  const [id] = props.args;
  console.log('producerC is running', id, props);
  let emitCount = 0;
  props.onAbort(
    props.run(function anotherProducer(otherProps) {
      let itId = setInterval(() => {
        if (emitCount < 5) {
          emitCount += 1;
          otherProps.onAbort(
            otherProps.run("counter", null, old => (old.data ?? 0) + 1)
          );
        }
      }, 1000);
      otherProps.onAbort(() => clearInterval(itId));
    })
  );
  return fetch("https://jsonplaceholder.typicode.com/users/" + id).then(res => res.json());
}

export default function Demo() {
  const {state, abort} = useAsyncState.payload({userId: 1}).auto(producerA);
  console.log('state#####', state);
  return (
    <div>
      <button
        onClick={() => abort()}>{state.status === "pending" ? 'Abort' : 'Stop'}</button>
      <button onClick={() => run()} disabled={state.status === "pending"}>run
      </button>
      <pre>{JSON.stringify(state, null, 2)}</pre>
    </div>
  );
}
