import axios from "axios";
import { Routes, Route, BrowserRouter as Router } from "react-router-dom";
import AsyncStateBoundary from "./suspense/abstraction";
import React from "react";
import {
  createSource,
  useAsyncState,
  runSource,
} from "react-async-states";
import SuspenseComponentTest from "./suspense";
import SuspenseComponent2Test from "./suspense/index2";
import SuspenseComponentNestedTest from "./suspense/index-nested";

const API = axios.create({
  baseURL: "https://jsonplaceholder.typicode.com"
});


async function fetchUser(props) {
  const controller = new AbortController();
  props.onAbort(() => {
    controller.abort()
  });

  const [id] = props.args;

  const userId = id ?? 1;

  // let timeoutId;
  // await new Promise((res) => {timeoutId = setTimeout(res, 500)})
  // props.onAbort(() => clearTimeout(timeoutId))

  const promise = API.get("/users/" + userId, {
    signal: controller.signal
  });
  // debugger;
  const usersResponse = await promise;
  return usersResponse.data;
}

const source = createSource("source", fetchUser, {resetStateOnDispose: false});
runSource(source);

const source2 = createSource("source2", fetchUser, {resetStateOnDispose: false});
runSource(source2, 2);

const sourceNested = createSource("sourceNested", fetchUser, {resetStateOnDispose: false});
runSource(sourceNested, 3);

function DebouncedSpinner() {
  const [mounted, setMounted] = React.useState(true);

  React.useEffect(() => {
    const id = setTimeout(() => setMounted(true), 400);
    return () => clearTimeout(id);
  }, [])


  if (mounted) {
    return "Loading...";
  }
  return null;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <AsyncStateBoundary fallback={<DebouncedSpinner/>} config={source}>
            <SuspenseComponentTest name="normal"/>
          </AsyncStateBoundary>
        }/>
        <Route path="/2" element={
          <AsyncStateBoundary fallback={<DebouncedSpinner/>} config={source2}>
            <SuspenseComponent2Test name="2"/>
          </AsyncStateBoundary>
        }>
          <Route path="/2/nested" element={
            <AsyncStateBoundary fallback={<DebouncedSpinner/>} config={sourceNested}>
              <SuspenseComponentNestedTest  name="nested"/>
            </AsyncStateBoundary>
          }/>
        </Route>
      </Routes>
    </Router>
  );
}


function Subscription() {
  const [userId, setUserId] = React.useState("");
  const {read, state, mode, uniqueId} = useAsyncState(
    {
      source,
      lazy: false,
      condition: !!userId,
      // runEffect: "debounce",
      // runEffectDurationMs: 400,
      payload: {
        userId
      }
    },
    [userId]
  );
  console.log('render!!', mode, uniqueId)
  const {status, data, props} = read();

  return (
    <div className="App">
      <input onChange={(e) => setUserId(e.target.value)}/>
      <h3>Status is: {status}</h3>
      {status === "success" && (
        <details open>
          <pre>{JSON.stringify(data, null, 4)}</pre>
        </details>
      )}
      {status === "error" && (
        <div>
          error while retrieving user with id: {props?.payload.userId}
          <pre>{data.toString()}</pre>
        </div>
      )}
    </div>
  );
}
