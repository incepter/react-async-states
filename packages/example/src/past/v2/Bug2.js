import React from "react";
import {
  AsyncStateProvider,
  useAsyncState,
  useSelector
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
          {Object.keys(asyncStates).map((t, i) => <SimpleSub key={`${t}-${i}`}
                                                              subKey={t}/>)}
          <br/>
          <Father/>
          <Sibling/>
          <br/>
          <br/>
          <DynamicSubscribe/>
          <br/>
          <br/>
          <EveryThingInsideProvider/>
          <SubscribeToWithInput />
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
  return <button onClick={() => run((old) => old.data + 1)}>
    FATHER - {state.data} - {uniqueId} - {mode}
  </button>;
}

function Sibling() {
  const {run, mode, state, uniqueId} = useAsyncState("counter");
  return (
    <button onClick={() => run((old) => old.data + 1)}>
      Run - {state.data} - {uniqueId} - {mode}
    </button>
  );
}

function DynamicSubscribe() {
  const inputRef = React.useRef();
  const [asyncStates, setAsyncStates] = React.useState([]);

  function onClick() {
    if (inputRef.current?.value) {
      setAsyncStates(old => ([...old, inputRef.current?.value]))
    }
  }

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
  const {mode, state, run} = useAsyncState({key: subKey, selector: t => ({...t})}, [subKey]);

  function onClick() {
    run(old => old.data + 1)
  }

  return (
    <p>
      <button onClick={onClick}> {subKey} - {mode} - {state?.data} - ok!</button>
    </p>
  )
}

function selectAll(all) {
  return all;
}

function EveryThingInsideProvider() {
  const everything = useSelector(() => "counter");


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

function SubscribeToWithInput() {
  const [key, setKey] = React.useState('');
  const result = useAsyncState(key, [key])
  console.log('result', result.mode, result.uniqueId, result.state);

  return (
    <div>
      <br />
      <br />
      <input value={key} onChange={e => setKey(e.target.value)} />
      <details open>
        <pre>{JSON.stringify(result, null, 4)}</pre>
      </details>
      <br />
      <SimpleSub subKey={key} />
    </div>
  );
}
