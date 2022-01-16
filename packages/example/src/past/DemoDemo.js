import React from "react";
import { useAsyncState } from "react-async-states";
import { demoAsyncStates } from "./Provider";

export function Inject() {
  useAsyncState({
    initialValue: {},
    key: "hakky-login",
    hoistToProvider: true,
    producer(props) {
      return {...props.lastSuccess.data, [props.args[0]]: props.args[1]};
    }
  });

  return null;
}


function getUser(props) {
  const controller = new AbortController();
  props.onAbort(() => {
    controller.abort()
  });
  console.log('props', props.payload.userId);
  return fetch(`https://jsonplaceholder.typicode.com/users`, {signal: controller.signal}).then(r => r.json());
}


export default function DemoDemo() {
  // const [isPending, startTransition] = React.useTransition();
  const {state: {status, data}, run} = useAsyncState(demoAsyncStates.users);

  console.log(data);
  return (
    <>
      <BuilderDemo/>
      <br />
      <br />
      <input onChange={e => {
        console.log('onchange, running');
        // startTransition(run);
        run();
      }}/>
      <br/>
      {status}
      <br/>
      <pre>
        {JSON.stringify(data, null, 4)}
      </pre>
    </>
  );
}

function timeout(delay, value, cb) {
  return new Promise(res => cb(setTimeout(() => res(value), delay)));
}
function interval(delay, value, cb) {
  return new Promise(res => cb(setTimeout(() => res(value), delay)));
}

function BuilderDemo() {
  const {state} = useAsyncState.builder()
    .lazy(false)
    .initialValue(0)
    .runEffect("delay")
    .runEffectDurationMs(2000)
    .selector(s => s.status === "pending" ? "pending...": JSON.stringify(s.data))
    .build(function producer(props) {
      let timeoutId;
      props.onAbort(() => clearTimeout(timeoutId));

      return timeout(2000, props.lastSuccess.data + 1, id => timeoutId = id);
    });

  return `state value is: ${state}`;
}






