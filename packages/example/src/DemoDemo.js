import React from "react";
import { useAsyncState, useAsyncStateSelector } from "react-async-states";
import { demoAsyncStates } from "./Provider";

export function Inject() {
  useAsyncState({
    initialValue: {},
    key: "hakky-login",
    hoistToProvider: true,
    promise(argv) {
      argv.payload.__provider__.select()
      argv.payload.__provider__.run("", "", "");
      return {...argv.lastSuccess.data, [argv.args[0]]: argv.args[1]};
    }
  });

  return null;
}



function getUser(argv) {
  const controller = new AbortController();
  argv.onAbort(() => {controller.abort()});
  console.log('argv', argv.payload.userId);
  return fetch(`https://jsonplaceholder.typicode.com/users`, {signal: controller.signal}).then(r => r.json());
}



export default function DemoDemo() {
  const {state: {status, data}, run} = useAsyncState(demoAsyncStates.users);

  console.log(data);
  return (
    <>
      <input onChange={e => {
        run()
      }} />
      <br />
      {status}
      <br />
      <pre>
        {JSON.stringify(data, null, 4)}
      </pre>
    </>
  );
}


















