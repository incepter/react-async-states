import React from 'react'
import { useAsyncState } from 'react-async-state'

const App = () => {

  const {
    key,
    run,
    state,
    abort,
  } = useAsyncState({
    key: "test",
    promiseConfig: {
      promise: (argv) => {
        const controller = new AbortController();
        const {signal} = controller;
        argv.onAbort(function abortSignal() {
          controller.abort();
        });
        return fetch('https://jsonplaceholder.typicode.com/users', {signal}).then(res => res.json());
      }
    },
    rerenderStatus: { loading: true, success: true, error: true }
  }, []);

  return (
    <div>
      <button onClick={() => run()}>RUN</button>
      <br />
      {key}
      <br />
      {state.status}
      <br />

      {state.status === "success" && <details><pre>{JSON.stringify(state.data, null, "  ")}</pre></details>}
      {state.status === "error" && <details><pre>{JSON.stringify(state.data, null, "  ")}</pre></details>}
      {state.status === "loading" && "loading..."}
    </div>
  )
}
export default App
