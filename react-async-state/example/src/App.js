import React from 'react';
import { useAsyncState } from 'react-async-state';
import DemoProvider from "./Provider";


const App = () => {

  const {key, run, state, abort} = useAsyncState("users", []);

  console.log({state});

  return (
    <div>
      <button onClick={() => run()}>RUN</button>
      <br/>
      async state key : {key}
      <br/>
      async state status : {state.status}
      <br/>
      Data:
      <br/>
      {state.status === "success" && <details>
        <pre>{JSON.stringify(state.data, null, "  ")}</pre>
      </details>}
      {state.status === "error" && <details>
        <pre>{state.data.toString()}</pre>
      </details>}
      {state.status === "loading" && (
        <>
          <span>loading...</span>

          <button onClick={abort}>abort</button>
        </>
      )}
    </div>
  )
}

function Wrapper() {
  return (
    <DemoProvider>
      <div style={{display: 'flex', padding: 32, width: "100wh"}}>
        <App/>
        <App/>
        <App/>
        <App/>
      </div>
    </DemoProvider>
  );
}

export default Wrapper;
