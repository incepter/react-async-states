import React from "react";
import { useAsyncState } from "react-async-states";


function remoteProducer(props) {
  const state = props.lastSuccess;
  const [type, payload] = props.args;

  console.log('running', state, type, payload);

  switch (type) {
    case "connect": {
      return new Promise((resolve, reject) => {
        const ws = new WebSocket("ws://localhost:9090");
        ws.addEventListener("error", (message) => {
          reject({error: message});
        });
        ws.addEventListener("open", (message) => {
          resolve({ws, messages: [], connected: !!ws});
        });
        ws.addEventListener("message", (message) => {
          props.emit(old => ({
            ...old.data,
            messages: ([...old.data.messages, {
              data: message.data,
              sender: "remote"
            }])
          }));
        });
        props.onAbort(() => ws.close());
      });
    }
    case "send": {
      state.data.ws.send(payload);
      return {
        ...state.data,
        messages: [...state.data.messages, {data: payload, sender: "me"}]
      };
    }
  }
  return null;
}

function wsProducer(props) {
  const ws = new WebSocket("ws://localhost:9090");
  ws.addEventListener("open", () => props.emit([]));


  props.onAbort(() => ws.close());
  return [];
}

function WsDemo() {
  const ref = React.useRef();
  const {state: {status, data}, run, abort} = useAsyncState.auto(remoteProducer);
  return (
    <div>
      <h1>Ws demo</h1>
      <h3>status is {status}</h3>
      <h2>State value is: <pre>{JSON.stringify(data ?? [], null, 4)}</pre>
      </h2>
      <button onClick={() => run("connect")}>connect</button>
      <br/>
      <input ref={ref}/>
      <button onClick={() => run("send", ref.current.value)}>send</button>
      <button
        onClick={() => abort()}>{status === "pending" ? "abort" : "stop"}</button>
    </div>
  );
}

function intervalProducer(props) {
  let intervalId = setInterval(() => props.emit(old => old.data + 1), 1000);
  props.onAbort(() => clearInterval(intervalId));
  return props.args[0] ?? 0;
}

function IntervalDemo() {
  const {state: {data}, run, abort} = useAsyncState.auto(intervalProducer);
  return (
    <div>
      <h1>Ws demo</h1>
      <h2>State value is: <pre>{JSON.stringify(data ?? [], null, 4)}</pre>
      </h2>
      <button onClick={() => run(data)}>Run</button>
      <button
        onClick={() => abort()}>{status === "pending" ? "abort" : "stop"}</button>
    </div>
  );
}

export default function DemoDemo() {

  return (
    <>
      <WsDemo/>
      <hr/>
      <IntervalDemo/>
    </>
  );
}
