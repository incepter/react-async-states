import React from "react";
import {
  createSource,
  useAsyncState,
  AsyncStateProvider,
  useRunLane,
} from "react-async-states";

function getUserDetails({onAbort, payload: {id}}) {
  const controller = new AbortController();

  onAbort(() => {
    controller.abort()
  });

  return fetch(
    `https://jsonplaceholder.typicode.com/users/${id}`,
    {signal: controller.signal}
  ).then(r => r.json());
}

const userDetailsSource = createSource(
  "user-details",
  getUserDetails,
  {
    cacheConfig: {
      enabled: true,
      getDeadline: () => 2000,
      hash: (_, payload) => payload.id,
      load: () => JSON.parse(localStorage.getItem("haha")),
      persist: c => localStorage.setItem("haha", JSON.stringify(c)),
    }
  }
);

export function LanesDemo() {
  const ref = React.useRef();
  const [state, setState] = React.useState([]);

  return (
    <AsyncStateProvider initialStates={[userDetailsSource]}>
      <input ref={ref}/>
      <button
        onClick={() => setState(old => ([...old, ref.current.value]))}>Add
      </button>
      <hr/>
      <UserDetailsRoot/>
      <hr/>
      {state.map((userId, i) => <UserDetails key={`${userId}-${i}`}
                                             userId={userId}/>)}


      <br/>
      <br/>
      <br/>
      <br/>
      <hr/>
      <PropsRunsDemo/>
    </AsyncStateProvider>
  );
}

function UserDetails({userId}) {
  const {state, run} = useAsyncState({
    lazy: false,
    lane: userId,
    payload: {id: userId},
    source: userDetailsSource,
  })

  return (
    <div>
      <details>
        <summary style={{
          backgroundColor: state.status === "pending" ? "cyan" : "transparent",
        }}>User {userId} details -- status is {state.status}
          <button onClick={() => run()}>run</button>
        </summary>
        <pre>
          {JSON.stringify(state, null, 4)}
        </pre>
      </details>
    </div>
  );
}

function UserDetailsRoot() {
  const {state} = useAsyncState({
    source: userDetailsSource,
  })

  return (
    <div>
      <details>
        <summary>User details root state</summary>
        <pre>
          {JSON.stringify(state, null, 4)}
        </pre>
      </details>
    </div>
  );
}


function runProducer(props) {
  const {args: [lane]} = props;

  props.run('user-details', {lane})
}

async function runpProducer(props) {
  const {args: [lane]} = props;

  const result = await props.runp('user-details', {lane})
  return 1;
}

function PropsRunsDemo() {
  const ref = React.useRef();

  const runLane = useRunLane();
  // const {run} = useAsyncState(runProducer)
  // const {run: runp} = useAsyncState(runpProducer)


  return (
    <div>
      <input ref={ref}/>
      <button
        onClick={() => runLane('user-details', ref.current.value, ref.current.value)}
      >runLane
      </button>
      <button
        onClick={() => userDetailsSource.getLaneSource(ref.current.value).run(ref.current.value)}
      >run Source Lane
      </button>
    </div>
  );
}

function countersProducer(props) {
  let intervalId = setInterval(() => props.emit(old => old.data + 1), 1000);
  props.onAbort(() => clearInterval(intervalId));
  return props.lastSuccess.data;
}

const countersSource = createSource(
  "counters",
  countersProducer,
  {initialValue: 0},
);

export default function LanesIntervalDemo() {
  return (
    <div>
      <CounterSub/>
      <CounterSub counterKey="counter-1"/>
      <CounterSub counterKey="counter-2"/>
    </div>
  );
}

function CounterSub({counterKey = "default"}) {
  const {state: {data}, run, abort} = useAsyncState({
    lane: counterKey,
    source: countersSource,
  });
  return (
    <div>
      <button
        data-testid={`counter-sub-${counterKey}-run`}
        onClick={() => run()}
      >Run</button>
      <button
        data-testid={`counter-sub-${counterKey}-abort`}
        onClick={() => abort()}>Abort</button>
      <span
        data-testid={`counter-sub-${counterKey}-data`}
      >
        counter-{counterKey}-{data}
      </span>
    </div>
  );
}
