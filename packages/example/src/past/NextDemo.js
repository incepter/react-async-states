import React from "react";
import { createSource, useAsyncState } from "react-async-states";

function* fetchUser(id) {
  return yield fetch(`https://jsonplaceholder.typicode.com/users/${id}`).then(s => s.json());
}

const user1Source = createSource("user1", () => fetchUser(1));
const user2Source = createSource("user2", () => fetchUser(2));
const userPayloadSource = createSource("userPayload", props => fetchUser(props.payload.userId));

const name = s => s.data?.name;

export default function NextDemo() {
  const {state: user1} = useAsyncState.selector(s => s.data).auto(user1Source);

  const {state: user2} = useAsyncState.selector(name).auto(user2Source);

  const {state: user3} = useAsyncState.payload({userId: 3}).selector(name).hoistAuto(userPayloadSource)

  const {state: user4} = useAsyncState.selector(name).payload({userId: 4}).forkAuto(userPayloadSource)

  return <>
    <div style={{display: "flex"}}>
      <pre>user1: {JSON.stringify(user1?.name, null, 4)}</pre>
      <pre>user2: {JSON.stringify(user2, null, 4)}</pre>
      <pre>user3: {JSON.stringify(user3, null, 4)}</pre>
      <pre>user4: {JSON.stringify(user4, null, 4)}</pre>
    </div>
    <hr/>
    <div>
      <RunEffectsDemo/>
    </div>
  </>;
}

let debounceIndex = 0;
let ThrottleIndex = 0;

function producer(props) {
  let timeoutId;
  props.onAbort(() => !console.log('clearing timeout') && clearTimeout(timeoutId));
  return new Promise(res => timeoutId = setTimeout(() => !console.log('invoking producer!', props.args[0]) && res(props.args[0]), 200));
}

function RunEffectsDemo() {

  const {run: runDebounced, state: {status: debouncedRunning, data: debounceIndexState}} = useAsyncState({
    producer,
    initialValue: 0,
    runEffect: "delay",
    runEffectDurationMs: 1000
  });
  const {run: runThrottled, state: {status: throttledRunning, data: throttleIndexState}} = useAsyncState({
    producer,
    initialValue: 0,
    runEffect: "throttle",
    runEffectDurationMs: 2000
  });


  return (
    <div>
      <button onClick={() => runDebounced(++debounceIndex)}>
        Run Debounced {debounceIndexState}
        {debouncedRunning === "pending" && "..."}
      </button>
      <button onClick={() => runThrottled(++ThrottleIndex)}>
        Run Throttled {throttleIndexState}
        {throttledRunning === "pending" && "..."}
      </button>
    </div>
  );
}
