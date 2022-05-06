import React from "react";
import { AsyncStateProvider, useAsyncState } from "react-async-states";

function Wrapper({children}) {
  const [mounted, setMounted] = React.useState(false);


  return (
    <div>
      <button onClick={() => setMounted(old => !old)}>Toggle</button>

      {mounted && children}
    </div>
  );
}

export default function App() {
  return (
    <AsyncStateProvider>
      <Wrapper>
        <Father />
        <br />
        <Sibling />
        <br />
        <ShowId />
      </Wrapper>
    </AsyncStateProvider>
  );
}

function Father() {
  const { mode, state, uniqueId, run } = useAsyncState({
    key: "counter",
    initialValue: 0,
    hoistToProvider: true
  });
  console.log({ father: true, mode, state, uniqueId });
  return <button onClick={() => run((old) => old.data + 1)}>
      FATHER - {state.data}
    </button>;
}

function ShowId() {
  const { run, mode, state, uniqueId } = useAsyncState("counter");
  console.log('show id', mode, uniqueId)
  return (
    <span>
      mode: {mode} -- value: {state.data}{" "}
      <button onClick={() => run((old) => old.data + 1)}>
        Run - {state.data}
      </button>
    </span>
  );
}

function Sibling() {
  const { run, mode, state, uniqueId } = useAsyncState("counter");
  console.log({ child: true, mode, state, uniqueId });
  return (
    <button onClick={() => run((old) => old.data + 1)}>
      Run - {state.data}
    </button>
  );
}
