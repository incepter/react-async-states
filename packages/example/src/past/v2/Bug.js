import {
  AsyncStateProvider,
  createSource,
  useAsyncState
} from "react-async-states";
import React from "react";

function load() {
  if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
    console.log('loading', localStorage?.getItem("remix-cache-users"));
    return localStorage.getItem("remix-cache-users");
  }
}
function persist(cache) {
  console.log('persisting!!', cache);
  if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
    localStorage?.setItem("remix-cache-users", JSON.stringify(cache))
  }
}

const timeout = createSource(
  'timeout',
  producer,
  {
    cacheConfig: {
      load,
      persist,
      enabled: true,
      hash: () => !console.log('hashing') && "users",
      getDeadline: () => 5000,
    }
  });


// @ts-ignore
function usersProducer(props) {
  const controller = new AbortController();
  const {signal} = controller;
  props.onAbort(function abortSignal() {
    controller.abort();
  });
  return fetch('https://jsonplaceholder.typicode.com/users', {signal})
    .then(res => res.json())
}


// @ts-ignore
function producer(props) {
  return new Promise(res => {
    let id = setTimeout(() => res("12"), 2000);
    props.onAbort(() => clearInterval(id));
  });
}

export default function Index() {
  return (
    <AsyncStateProvider initialStates={[timeout]}>
      <Test />
    </AsyncStateProvider>
  );
}

function Test() {
  const {run, mode, state, source} = useAsyncState.auto("users");

  console.log(++React.useRef(0).current, mode, state?.status, source?.uniqueId);
  return (
    <div>
      <button onClick={() => run()}>reload</button>
      <details open>
        <pre>
          {JSON.stringify(state, null, 4)}
        </pre>
      </details>
    </div>
  );
}
