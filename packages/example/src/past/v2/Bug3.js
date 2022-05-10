import axios from "axios";
import React from "react";
import {
  useAsyncState,
  UseAsyncState,
} from "react-async-states";

const API = axios.create({
  baseURL: "https://jsonplaceholder.typicode.com"
});


async function fetchUser(props){
  const controller = new AbortController();
  props.onAbort(() => controller.abort());

  const { userId } = props.payload;

  const usersResponse = await API.get("/users/" + userId, {
    signal: controller.signal
  });
  return usersResponse.data;
}

export default function App() {
  const [userId, setUserId] = React.useState("");
  const { state } = useAsyncState(
    {
      lazy: false,
      condition: !!userId,
      producer: fetchUser,
      skipPendingDelayMs: 1000,
      // runEffect: "debounce",
      // runEffectDurationMs: 400,
      payload: {
        userId
      }
    },
    [userId]
  );
  const { status, data, props } = state;

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
