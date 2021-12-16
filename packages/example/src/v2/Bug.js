import React from "react";
import { useAsyncState, AsyncStateProvider, createReducerProducer } from "react-async-states";

export default function Bug() {
  return (
    <AsyncStateProvider>
      <h2>From Here we are inside the provider</h2>
      <CounterReducerExample />
      <CounterReducerExampleSub />
      <CounterReducerExampleFork />
    </AsyncStateProvider>
  );
}


function counterReducer(oldValue, action) {
  console.log("action", action, oldValue);
  return (oldValue || 0) + (action === "increment" ? 1 : -1);
}

// you can create a source by this producer and share it at module level
const counterReducerProducer = createReducerProducer(counterReducer);

export function CounterReducerExample() {
  const { key, state, run } = useAsyncState.hoist({
    key: "reducerCounter",
    producer: counterReducerProducer
  });

  return (
    <Counter
      value={state.data || 0}
      label={"counterReducer example, this component hoists this state: " + key}
      increment={() => run("increment")}
      decrement={() => run("decrement")}
    />
  );
}

export function CounterReducerExampleSub() {
  const { key, state, run } = useAsyncState("reducerCounter");

  if (!state) {
    return (
      <>
        <hr />
        "waiting..."
      </>
    );
  }
  return (
    <Counter
      value={state?.data || 0}
      label={"counterReducer example, this component will wait for the state: "+key}
      increment={() => run("increment")}
      decrement={() => run("decrement")}
    />
  );
}

export function CounterReducerExampleFork() {
  const { key, state, run } = useAsyncState.fork("reducerCounter");

  if (!state) {
    return (
      <>
        <hr />
        "waiting..."
      </>
    );
  }
  console.log('===>')
  return (
    <>
      <ForkedCounterByKey counterKey={key} />
      <Counter
        value={state.data || 0}
        label={"counterReducer example, this component forks the counterReducer state: " + key}
        increment={() => run("increment")}
        decrement={() => run("decrement")}
      />
    </>
  );
}
export function ForkedCounterByKey({counterKey}) {
  const { key, state, run } = useAsyncState(counterKey);
  console.log('counter reducer');

  if (!state) {
    return (
      <>
        <hr />
        "waiting..."
      </>
    );
  }
  return (
    <>
      <Counter
        value={state.data || 0}
        label={"counterReducer example, this component subscribes to the forked counterReducer states: " + key}
        increment={() => run("increment")}
        decrement={() => run("decrement")}
      />
    </>
  );
}
function Counter({ label, value, increment, decrement }) {
  return (
    <div>
      <h3>{label}</h3>
      <button onClick={decrement}>-</button>
      <span>{value}</span>
      <button onClick={increment}>+</button>
    </div>
  );
}
