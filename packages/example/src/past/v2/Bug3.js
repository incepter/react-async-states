import axios from "axios";
import AsyncStateBoundary from "./suspense/abstraction";
import React from "react";
import {
  createSource,
  useAsyncState,
  runSource,
} from "react-async-states";
import SuspenseComponentTest from "./suspense";

const API = axios.create({
  baseURL: "https://jsonplaceholder.typicode.com"
});


async function fetchUser(props){
  const controller = new AbortController();
  props.onAbort(() => {
    controller.abort()
  });

  const { userId: id } = props.payload;

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

const source = createSource("source", fetchUser, { resetStateOnDispose: false });
runSource(source);

function DebouncedSpinner() {
  const [mounted, setMounted] = React.useState(false);

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
    <AsyncStateBoundary fallback={<DebouncedSpinner />} config={source}>
      <SuspenseComponentTest />
    </AsyncStateBoundary>
  );
}


function Subscription() {
  const [userId, setUserId] = React.useState("");
  const { read, state, mode, uniqueId } = useAsyncState(
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
  const { status, data, props } = read();

  return (
    <div className="App">
      <input onChange={(e) => setUserId(e.target.value)} />
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
