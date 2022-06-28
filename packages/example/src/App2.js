import React from "react";
import {
  RenderStrategy,
  StateBoundary,
  useCurrentState
} from "react-async-states";

const config = {
  lazy: false,
  producer: async function () {
    const response = await fetch('https://jsonplaceholder.typicode.com/users/1');
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

export default function App2() {
  return (
    <Wrapper>
      <h1>Result!</h1>
      <StateBoundary config={config} strategy={RenderStrategy.FetchAsYouRender}>
        <CurrentState/>
      </StateBoundary>
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
