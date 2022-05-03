import React from "react";
import {
  createSource,
  AsyncStateComponent,
  useAsyncState
} from "react-async-states";

function fetchUser(id) {
  return fetch(`https://jsonplaceholder.typicode.com/users`)
    .then(s => {
      if (Math.random() < 0.5) {
        throw new Error('RANDOM ERROR');
      }
      if (s.status !== 200) {
        throw "user not found";
      }
      return s;
    })
    .then(s => s.json());
}

const user1Source = createSource("user1", () => fetchUser(12));
const user2Source = createSource("user2", () => fetchUser(2));
const userPayloadSource = createSource("userPayload", props => fetchUser(props.payload.userId));

function timeout(delay) {
  return new Promise(res => {
    setTimeout(res, delay)
  });
}

const usersList = createSource("global", () => timeout(400).then(() => fetchUser(11)))

export default function Demo() {
  return (
    <AsyncStateComponent
      strategy={1}
      error={Error}
      fallback={Loading}
      children={UsersList}
      config={{source: usersList, lazy: false}}
    />
  );
}

function Log({alias}) {
  console.log('async state component child', alias)
  return null
}

function Error({state, run}) {
  console.log('state ERROR COMPO', state)
  return (
    <button onClick={() => run()}>Oops...
      Some
      error: {state?.data?.toString()}</button>
  );
}

function Loading({state: {status}, abort, run}) {
  if (status === "aborted") {
    return <button onClick={() => run()}>ABORTED...</button>;
  }
  return <button onClick={() => abort()}>Loading...!! click to abort</button>;
}

function UsersList() {
  const result = useAsyncState(usersList);
  const {state, run} = result;

  console.log('LIST', result.state)
  return <details open>
    <button onClick={() => run()}>run</button>
    <pre>{JSON.stringify(state.data, null, 4)}</pre>
  </details>
}

function NextDemo() {
  return <>
    <AsyncStateComponent error="errooooooorrrr" strategy={1}
                         config={{source: user1Source, lazy: false}}
                         fallback="loading...">
      {(state) => (
        <div>
          success!
          {JSON.stringify(state, null, 2)}
        </div>
      )}
    </AsyncStateComponent>
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

  const {
    run: runDebounced,
    state: {status: debouncedRunning, data: debounceIndexState}
  } = useAsyncState({
    producer,
    initialValue: 0,
    runEffect: "delay",
    runEffectDurationMs: 1000
  });
  const {
    run: runThrottled,
    state: {status: throttledRunning, data: throttleIndexState}
  } = useAsyncState({
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
      <TearingExample title="1"/>
      <TearingExample title="2"/>
      <TearingExample title="3"/>
      <TearingExample title="4"/>
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
      <br/>
    </div>
  );
}
