import React from "react";
import { useAsyncState } from "react-async-states";

function intervalProducer(props) {
  const ws = new WebSocket("ws://localhost:9090");

  ws.addEventListener("open", () => {
    props.emit([]);
  });

  ws.addEventListener("message", (message) => {
    props.emit(old => ([
      ...old.data,
      message.data
    ]));
  });

  props.onAbort(() => {
    props.emit(["hahaha"]);
    ws.close();
  });
  return new Promise(res => setTimeout(() => res([]), 3000));
}

export default function DemoDemo() {
  const {state: {status, data}, run, abort} = useAsyncState.auto(intervalProducer);

  return (
    <div>
      <h3>status is {status}</h3>
      <h2>State value is: <pre>{JSON.stringify(data ?? [], null, 4)}</pre>
      </h2>
      <button onClick={() => run(data)}>Run</button>
      <button onClick={() => abort({bghit: true})}>Abort</button>
    </div>
  );
}
