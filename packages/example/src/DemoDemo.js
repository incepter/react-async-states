import React from "react";
import { useAsyncState, useAsyncStateSelector } from "react-async-states";
import { demoAsyncStates } from "./Provider";

export function Inject() {
  useAsyncState({
    initialValue: {},
    key: "hakky-login",
    hoistToProvider: true,
    producer(props) {
      props.payload.__provider__.select()
      props.payload.__provider__.run("", "", "");
      return {...props.lastSuccess.data, [props.args[0]]: props.args[1]};
    }
  });

  return null;
}



function getUser(props) {
  const controller = new AbortController();
  props.onAbort(() => {controller.abort()});
  console.log('props', props.payload.userId);
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


















