import React from "react";
import { useAsyncState } from "react-async-states";


function brokerProducer(props) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket("ws://localhost:9091");
    ws.addEventListener("error", (message) => {
      reject({connected: false, error: message});
    });
    ws.addEventListener("open", () => {
      resolve({ws, connected: true});
    });
    ws.addEventListener("message", (message) => {
      const jsonData = JSON.parse(message.data);
      const {to} = jsonData;
      if (to) {
        props.run(to, jsonData);
      }
    });
    props.onAbort(() => ws.close());
  });
}

function logsProducer(props) {
  const msg = props.args[0];
  if (msg) {
    return [...(props.lastSuccess.data ?? []), msg];
  }
}

function productsProducer(props) {
  const msg = props.args[0];
  if (msg) {
    return [...(props.lastSuccess.data ?? []), msg];
  }
}

function conversationsProducer(props) {
  const msg = props.args[0];
  if (msg) {
    return [...(props.lastSuccess.data ?? []), msg];
  }
}

export default function BrokerDemo() {
  return (
    <>
      <BrokerSetup/>
      <BrokerSubs subKey="logs"/>
      <BrokerSubs subKey="products"/>
      <BrokerSubs subKey="conversations"/>
    </>
  );
}

function BrokerSetup() {
  const {state: {status}} = useAsyncState.auto(brokerProducer);
  useAsyncState.hoist({key: "logs", producer: logsProducer});
  useAsyncState.hoist({key: "products", producer: productsProducer});
  useAsyncState.hoist({key: "conversations", producer: conversationsProducer});

  return (
    <div>
      Broker status: {status}
    </div>
  );
}

function BrokerSubs({subKey}) {
  const {mode, state} = useAsyncState(subKey);

  return (
    <span>
      broker sub {subKey} on mode {mode}
      <pre>
        {JSON.stringify((state.data ?? []), null, 4)}
      </pre>
    </span>
  );
}
