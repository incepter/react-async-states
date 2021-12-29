import React from "react";
import { useAsyncState, createSourceAsyncState } from "react-async-states";

function userProducer(props) {
  const controller = new AbortController();
  props.onAbort(() => {
    console.log("abort", props.payload);
    controller.abort();
  });


  const { userId } = props.payload;
  if (!userId) {
    throw "user id is required, received " + userId;
  }
  return fetch("https://jsonplaceholder.typicode.com/users/" + userId, {
    signal: controller.signal
  }).then((res) => {
    console.log('inside then', props.aborted)
    return res.json();
  });
}

const currentUser = createSourceAsyncState("current-user", userProducer);

function MiniApp() {
  const [value, setValue] = React.useState("");

  const {
    abort,
    run,
    state: { status, data }
  } = useAsyncState
    .condition(!!value)
    .payload({ userId: value })
    .auto(currentUser, [value]);

  const myref = React.useRef();
  return (
    <div className="App">
      <input ref={myref} placeholder="type user id" />
      <button
        onClick={() => {
          setValue(myref.current.value + "");
          run();
        }}
      >
        fetch user
      </button>
      {status === "pending" && (
        <button onClick={() => abort("bghit")}>Abort</button>
      )}
      <h1>Status: {status}</h1>
      <h2>Data:</h2>
      <details>
        <pre>{JSON.stringify(data ?? {}, null, "  ")}</pre>
      </details>
    </div>
  );
}

function FarAwayComponent() {
  const {
    state: { status }
  } = useAsyncState(currentUser);

  return "state status is: " + status;
}

export default function App() {
  const {
    run,
    replaceState,
    state: { data }
  } = useAsyncState();

  return (
    <>
      <span>state value is : {data}</span>
      <br />
      <FarAwayComponent />
      <MiniApp />

      <input onChange={(e) => replaceState(e.target.value)} />
    </>
  );
}

