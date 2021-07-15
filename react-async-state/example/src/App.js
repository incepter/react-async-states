import React from 'react';
import { useAsyncState } from 'react-async-state';
import DemoProvider from "./Provider";

function WrapToggle({children}) {
  const [shouldDisplay, setShouldDisplay] = React.useState(true);


  return (
    <>
      <button onClick={() => setShouldDisplay(old => !old)}>Toggle</button>
      <br/>
      {shouldDisplay && typeof children === "function" && children()}
      {shouldDisplay && typeof children !== "function" && children}
    </>
  );

}

function ForkSubscription({forkKey}) {
  let value = useAsyncState(forkKey, [])?.state;
  return JSON.stringify(value);
}


const App = ({fork = false, payload}) => {

  const {key, run, state, abort} = useAsyncState({key: "users", fork, hoistToProvider: true, payload}, []);

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
      {fork && <ForkSubscription forkKey={key}/>}
    </div>
  )
}

function Wrapper() {
  const [shouldDisplay, setShouldDisplay] = React.useState(true);
  return (
    <DemoProvider>
      <button onClick={() => setShouldDisplay(old => !old)}>Toggle</button>

      {shouldDisplay && (
        <div style={{display: 'flex', padding: 32, maxWidth: '1200px', justifyContent: 'space-around'}}>
          <WrapToggle>
            {() => <App fork payload={{fork: "haha"}}/>}
          </WrapToggle>
          <App/>
          <App/>
        </div>)}
    </DemoProvider>
  );
}

export default Wrapper;
