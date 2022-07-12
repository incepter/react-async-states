import React from "react";
import {
  RenderStrategy,
  StateBoundary,
  useCurrentState,
  AsyncStateStatus
} from "react-async-states";

const config = {
  lazy: false,
  producer: async function () {
    const response = await fetch('https://jsonplaceholder.typicode.com/users/12');
    if (!response.ok) {
      throw new Error(response.status);
    }
    return response.json();
  }
}

function Wrapper({children}) {
  const [t, e] = React.useState(false);

  return (
    <>
      <button onClick={() => e(f => !f)}>Toggle</button>
      {t && children}
    </>
  )
}

function MyError() {
  const {state: {data: error}} = useCurrentState();

  return <div>This error is happening: {error?.toString?.()}</div>
}

function MyPending() {
  const {state: {props}} = useCurrentState();

  return <div>PENDING WITH PROPS: {JSON.stringify(props, null, 4)}</div>
}

export default function App2() {
  return (
    <Wrapper>
      <h1>Result!</h1>
      <StateBoundary
        config={config}
        strategy={RenderStrategy.FetchThenRender}
        render={{
          [AsyncStateStatus.error]: <MyError/>,
          [AsyncStateStatus.success]: <CurrentState/>,
        }}
      />
    </Wrapper>
  );
}

function CurrentState() {
  const currentState = useCurrentState();
  return <details open>
    <summary>Current state details {currentState.state.status}</summary>
    <pre>
      {JSON.stringify(currentState, null, 4)}
    </pre>
  </details>
}
