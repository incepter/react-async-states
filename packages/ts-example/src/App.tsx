import React from 'react';
import {useAsyncState, UseAsyncState, createSource, State, AsyncStateStatus} from "react-async-states";
import logo from './logo.svg';
import './App.css';
import {AsyncStateSource, Producer} from "react-async-states/src";

const source = createSource("key", null, {initialValue: 0}) as AsyncStateSource<number>;

function App() {
  let {state: {}}: UseAsyncState<number> = useAsyncState(source);

  const {state: {status}}: UseAsyncState<any> = useAsyncState({
    fork: true,

  });
  if (status === AsyncStateStatus.initial) {

  }
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo"/>
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
