import React from 'react';
import { useAsyncState } from 'react-async-state';
import DemoProvider from "./Provider";


const App = ({fork = false, payload}) => {

  const {key, run, state, abort} = useAsyncState({key: "users", fork, payload}, []);

  // console.log({state});

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
  const [shouldDisplay, setShouldDisplay] = React.useState(true);
  return (
    <DemoProvider>
      <button onClick={() => setShouldDisplay(old => !old)}>Toggle</button>

      {shouldDisplay && (<div style={{display: 'flex', padding: 32, maxWidth: '1200px', justifyContent: 'space-around'}}>
        <App fork={false} payload={{fork: "haha"}}/>
        <App/>
        <App/>
        <App/>
      </div>)}
    </DemoProvider>
  );
}

export default Wrapper;
