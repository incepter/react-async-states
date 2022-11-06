import React from 'react';
import axios from 'axios';
import {createRoot} from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import {
  ProducerProps,
  ProducerRunEffects,
  useAsyncState
} from "react-async-states/src";

// @ts-ignore
createRoot(document.getElementById('root'))
  .render(<React.StrictMode>
      <App/>
    </React.StrictMode>
  )
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

const API = axios.create({
  baseURL: "https://jsonplaceholder.typicode.com"
});

type User = {
  id: number;
  email: string;
  name: string;
};

async function fetchUser(props: ProducerProps<User>): Promise<User> {
  const controller = new AbortController();
  props.onAbort(() => controller.abort());

  const [userId] = props.args;

  const usersResponse = await API.get("/users/" + userId, {
    // @ts-ignore
    signal: controller.signal
  });

  return usersResponse.data;
}

function Haha() {
  const { run, state } = useAsyncState({
    lazy: true,
    producer: fetchUser,
    runEffectDurationMs: 400,
    runEffect: ProducerRunEffects.debounce
  });
  const { status, data, props } = state;

  return (
    <div className="App">
      <input placeholder="user id" onChange={(e) => run(e.target.value)} />
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
