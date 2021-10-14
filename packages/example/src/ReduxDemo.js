import React from "react";
import { createSourceAsyncState, useAsyncState } from "react-async-states";

function* reduxPromise(argv) {
  yield argv.lastSuccess.data.store.dispatch(...argv.args, argv);
  return argv.lastSuccess.data;
}

const initialRedux = {}; // createReduxStore(reducers, middlewares...);
const reduxSource = createSourceAsyncState("redux", reduxPromise, {initialValue: initialRedux});

export default function Demo() {

  return (
    <>
      <DemoDemo/>
      <br />
      <br />
      <br />
      <br />
      <br />
      <DemoDemoSUb />
    </>
  );
}

function useBetterSimpleState(config, deps) {
  const asyncState = useAsyncState(config, deps);
  return [asyncState.state, asyncState.run];
}

function DemoDemo() {
  const {state: {status}, lastSuccess: {data: lastSuccessData}, run} = useAsyncState({
    key: "some-name",
    hoistToProvider: true,
    promise: (argv) => { // ./promises.js but works as inline
      const controller = new AbortController();
      const {signal} = controller;
      argv.onAbort(() => controller.abort());
      return fetch(`https://jsonplaceholder.typicode.com/users/${argv.args[0]}`, {signal}).then(res => res.json())
    },
  });

  return <div>
    {status === "pending" && "loading..."}
    {status !== "error" && <div>user is: <pre>{lastSuccessData?.id}</pre></div>}
    <button onClick={() => run((lastSuccessData?.id || 0) - 1)}>decrement</button>
  </div>
}

function DemoDemoSUb() {
  const {state: username, lastSuccess, run} = useAsyncState({
    key: "some-name",
    rerenderStatus: {pending: false},
    selector: s => s.data?.name,
  });

  return (
    <div>
      name is: {username}
      <button onClick={() => run((lastSuccess.data?.id || 0) + 1)}>increment</button>
    </div>
  );
}
