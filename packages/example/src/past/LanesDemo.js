import React from "react";
import { createSource, useAsyncState } from "react-async-states";

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

const userDetailsSource = createSource("user-details", getUserDetails);

export default function LanesDemo() {
  const ref = React.useRef();
  const [state, setState] = React.useState([]);

  return (
    <div>
      <input ref={ref}/>
      <button
        onClick={() => setState(old => ([...old, ref.current.value]))}>Add
      </button>
      <hr/>
      <UserDetailsRoot/>
      <hr/>
      {state.map((userId, i) => <UserDetails key={`${userId}-${i}`}
                                             userId={userId}/>)}
    </div>
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
