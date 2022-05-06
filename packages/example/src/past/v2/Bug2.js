import React from "react";
import {
  AsyncStateProvider,
  useAsyncState,
  useAsyncStateSelector
} from "react-async-states";

function Wrapper({children}) {
  const [mounted, setMounted] = React.useState(false);


  return (
    <div>
      <button onClick={() => setMounted(old => !old)}>Toggle</button>

      {mounted && children}
    </div>
  );
}

let meter = 0;

function newOne(key) {
  return {
    key,
    config: {
      initialValue: key.length,
    }
  };
}

export default function App() {
  const inputRef = React.useRef();
  const [asyncStates, setAsyncStates] = React.useState({});

  function onClick() {
    if (inputRef.current?.value) {
      setAsyncStates(old => ({
        ...old,
        [inputRef.current.value]: newOne(inputRef.current.value)
      }))
    }
  }

  console.log('initial states', asyncStates)
  return (
    <>
      <section>
        <input ref={inputRef}/>
        <button
          onClick={onClick}>Add
        </button>
      </section>
      <AsyncStateProvider initialStates={asyncStates}>
        <Wrapper>
          <br/>
          <Father/>
          <Sibling/>
          <br/>
          <br/>
          <DynamicSubscribe/>
          <br/>
          <br/>
          <EveryThingInsideProvider/>
        </Wrapper>
      </AsyncStateProvider>
    </>
  );
}

function Father() {
  const {mode, state, uniqueId, run} = useAsyncState({
    key: "counter",
    initialValue: 0,
    hoistToProvider: true
  });
  console.log({father: true, mode, state, uniqueId});
  return <button onClick={() => run((old) => old.data + 1)}>
    FATHER - {state.data}
  </button>;
}

function ShowId() {
  const {run, mode, state, uniqueId} = useAsyncState("counter");
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
  const {run, mode, state, uniqueId} = useAsyncState("counter");
  console.log({child: true, mode, state, uniqueId});
  return (
    <button onClick={() => run((old) => old.data + 1)}>
      Run - {state.data}
    </button>
  );
}

function DynamicSubscribe() {
  const inputRef = React.useRef();
  const [asyncStates, setAsyncStates] = React.useState([]);

  function onClick() {
    console.log(inputRef.current)
    if (inputRef.current?.value) {
      setAsyncStates(old => ([...old, inputRef.current?.value]))
    }
  }

  console.log('subscribing to', asyncStates)
  return (
    <section>
      <input ref={inputRef}/>
      <button
        onClick={onClick}>Add
      </button>
      <br/>
      <br/>
      <main>
        {asyncStates.map((t, i) => <SimpleSub key={`${t}-${i}`} subKey={t}/>)}
      </main>
    </section>
  );
}

function SimpleSub({subKey}) {
  const {mode, state, run} = useAsyncState(subKey);

  function onClick() {
    run(old => old.data + 1)
  }

  return (
    <p>
      <button onClick={onClick}> {subKey} - {mode} - {state?.data}</button>
    </p>
  )
}

function selectAll(all) {
  return all;
}

function EveryThingInsideProvider() {
  const everything = useAsyncStateSelector(() => "counter");


  return (
    <ul>
      {Object.entries(everything).map(([key, state], i) => (
        <li key={`${key}-${i}`}>
          <pre>{key} - {state?.data}</pre>
        </li>
      ))}
    </ul>
  )
}
