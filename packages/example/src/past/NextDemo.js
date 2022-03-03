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
  const {state: user1} = useAsyncState.auto({source: user1Source, selector: s => s.data});

  const {state: user2} = useAsyncState.auto({source: user2Source, selector: name});

  const {state: user3} = useAsyncState.hoistAuto({source: userPayloadSource, payload: {userId: 3}, selector: name})

  const {state: user4} = useAsyncState.forkAuto({source: userPayloadSource, payload: {userId: 4}, selector: name})

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
    <hr/>
    <div>
      <TearingDemo />
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


function TearingDemo() {

  return (
    <>
      <TearingExample title="1" />
      <TearingExample title="2" />
      <TearingExample title="3" />
      <TearingExample title="4" />
    </>
  );
}

function tearingProducer(props) {
  return new Promise((resolve, reject) => {
    function listener(e) {
      props.emit({x: e.clientX, y: e.clientY});
    }
    document.addEventListener("mousemove", listener);
    props.onAbort(() => document.removeEventListener("mousemove", listener));

    resolve({x: 0, y: 0});
  });
}

function TearingExample({title}) {
  const {state: {data}} = useAsyncState.auto(tearingProducer);
  const {state: {data: data2}} = useAsyncState.auto(tearingProducer);
  const {state: {data: data3}} = useAsyncState.auto(tearingProducer);
  const {state: {data: data4}} = useAsyncState.auto(tearingProducer);
  const different = data?.x !== data2?.x || data?.y !== data2?.y
    || data?.x !== data3?.x || data?.y !== data3?.y ||
    data?.x !== data4?.x || data?.y !== data4?.y;

  return (
    <div>
      {different && <h1>____SEE HERE____</h1>}
      <h3>Tearing example: {title}</h3>
      <pre>
        {JSON.stringify((data ?? {}), null, 4)}
      </pre>
      <br />
    </div>
  );
}
