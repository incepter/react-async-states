import React from "react";
import { useAsyncState, AsyncStateProvider } from "react-async-states";

function timeout(delay, resolveValue, setTimeoutId) {
  return new Promise(function resolver(resolve) {
    setTimeoutId(
      setTimeout(() => {
        resolve(resolveValue);
      }, delay)
    );
  });
}

function* doSomething(props) {
  const searchValue = props.args[0];
  const delay = !searchValue ? 0 : 3000 / searchValue.length;
  let timeoutId = null;
  props.onAbort(() => clearTimeout(timeoutId));

  const returnValue = yield timeout(delay, searchValue, (id) => {
    timeoutId = id;
  });
  yield props.payload.onSuccess();

  return returnValue;
}

function randomInt(min = 0, max = 255) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function randomColor() {
  return `rgb(${randomInt()}, ${randomInt()},${randomInt()})`;
}

function invokeIfPresent(fn, ...args) {
  return typeof fn === "function" ? fn(...args) : undefined;
}

function AppWrapped() {
  const {
    state: { status, data, props },
    abort,
    run
  } = useAsyncState.hoist({
    producer: doSomething,
    key: "do-something",
    payload: {
      onSuccess() {
        document.body.style.backgroundColor = randomColor();
      }
    }
  });
  const {
    state,
    replaceState
  } = useAsyncState({ key: "do-something" });

  if (!state) {
    return "waiting!";
  }

  const { data: value } = state;

  return (
    <div className="App">
      <input
        value={value}
        onChange={(e) => replaceState(e.target.value)}
        placeholder="type something---"
      />
      <hr />
      <input
        onChange={(e) => run(e.target.value)}
        placeholder="type something"
      />
      <hr />
      <h2>Search value: {JSON.stringify(props?.args?.[0])}</h2>
      <hr />
      <h3>status: {status}</h3>
      {status === "pending" && (
        <button onClick={() => abort("USER BGHA")}>Abort</button>
      )}
      {status === "aborted" && (
        <button onClick={() => run(props?.args?.[0])}>
          Retry
        </button>
      )}
      <h3>Data: {data}</h3>
    </div>
  );
}

const empty_array = [];
export default function App() {
  return (
    <AsyncStateProvider initialStates={empty_array}>
      <AppWrapped />
      <SomethingElse />
    </AsyncStateProvider>
  );
}

function SomethingElse() {
  const { lastSuccess } = useAsyncState("do-something");

  return (
    <div>
      <br />
      <hr />
      <pre>{JSON.stringify(lastSuccess, null, "  ")}</pre>
    </div>
  );
}
