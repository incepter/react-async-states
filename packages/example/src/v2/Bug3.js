import React from "react";
import { useAsyncState, createSourceAsyncState } from "react-async-states";

const request = () =>
  fetch("https://jsonplakceholder.typicode.com/posts/1")
    .then((response) => response.json());

const requestok = () =>
  fetch("https://jsonplaceholder.typicode.com/posts/1")
    .then((response) => response.json());

function* producer() {
  try {
    yield 4;
    yield 2;
    yield requestok();
    return yield request();
  } catch (e) {
    console.log("generator catch");
    return 12;
  }
}

function addIsThing(state) {
  const {status} = state;
  return {
    isPending: status === "pending",
    isInitial: status === "initial",
    isError: status === "error",
    isAborted: status === "aborted",
    isSuccess: status === "success"
  }
}

const source = createSourceAsyncState("test", producer, {stateExtender: t => ({ haha: true })});

export default function App() {
  const { state } = useAsyncState.auto({source, stateExtender: addIsThing});
  console.log("state =>", state);
  return <div className="App"><pre>{JSON.stringify(state, null, 4)}</pre></div>;
}
