import React from "react";
import { createSource, useAsyncState, AsyncStateProvider } from "react-async-states";

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

export default function LanesDemo() {
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


      <br />
      <br />
      <br />
      <br />
      <hr />
      <PropsRunsDemo />
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
        }}>User {userId} details -- status is {state.status} <button onClick={() => run()}>run</button></summary>
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

  const {run} = useAsyncState(runProducer)
  const {run: runp} = useAsyncState(runpProducer)


  return (
    <div>
    <input ref={ref} />
      <button onClick={() => run(ref.current.value)}>run</button>
      <button onClick={() => runp(ref.current.value)}>runp</button>
    </div>
  );
}
