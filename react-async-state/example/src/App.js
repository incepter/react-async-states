import React from 'react';
import { isEqual } from 'lodash';
import { useAsyncState, useAsyncStateSelector } from 'react-async-state';
import DemoProvider from "./Provider";

function SelectorDemo({asyncStateKey, selector, areEqual}) {
  const value = useAsyncStateSelector(asyncStateKey, selector, areEqual);

  console.log('HEHEHE', value);
  return null;
  // return <span><pre>{JSON.stringify(value, null, "  ")}</pre></span>;
}

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
      {/*{fork && <SelectorDemo asyncStateKey={key} selector={identity} areEqual={isEqual}/>}*/}
      {/*{fork && <ForkSubscription forkKey={key}/>}*/}
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
            {() => <App fork={false} payload={{fork: "haha"}}/>}
          </WrapToggle>
          <SelectorDemo asyncStateKey={["users", "posts"]} selector={usersPostsSelector} areEqual={isEqual}/>
        </div>)}
    </DemoProvider>
  );
}

function usersPostsSelector(usersState, postsState) {
  if (!usersState || !postsState || usersState.status === "loading" || postsState.status === "loading") {
    return undefined;
  }
  return {users: usersState.data.map(user => ({ ...user, posts: postsState.data.find(t => t.userId === user.id) }))};
}

export default Wrapper;
