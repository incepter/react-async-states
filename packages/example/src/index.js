import React from 'react'
import ReactDOM from 'react-dom/client'

import './index.css'
import App from "./past/App";

import App2 from './past/v2/Bug2';


import { createSource, useSource, useAsyncState } from "react-async-states";

function getOrCreateHost(id) {
  const maybeElement = document.getElementById(id);
  if (!maybeElement) {
    const host = document.createElement("div");
    host.setAttribute("id", id);
    document.body.appendChild(host);
    return host;
  }
  return maybeElement;
}

function initVanillaHost(host) {
  const incrButton = document.createElement("button");
  incrButton.innerHTML = "+";
  incrButton.addEventListener("click", increment);
  const decrButton = document.createElement("button");
  decrButton.innerHTML = "-";
  decrButton.addEventListener("click", decrement);
  const span = document.createElement("span");
  span.setAttribute("id", "vanilla-content");
  span.innerHTML = "Counter value is " + counterSource.getState().data;
  const title = document.createElement("h1");
  title.innerHTML = "Vanilla js";
  host.appendChild(title);
  host.appendChild(decrButton);
  host.appendChild(span);
  host.appendChild(incrButton);

}

const root1Host = getOrCreateHost("root");
const root2Host = getOrCreateHost("root2");
const vanillaHost = getOrCreateHost("vanilla");

const root = ReactDOM.createRoot(root1Host);
const root2 = ReactDOM.createRoot(root2Host);

const counterSource = createSource("counter", null, {initialValue: 0});
const decrement = () => counterSource.setState(p => p.data - 1);
const increment = () => counterSource.setState(p => p.data + 1);

function userProducer() {
  return fetch(`https://jsonplaceholder.typicode.com/users/1`).then((res) =>
    res.json()
  );
}

const source = createSource("user-1", userProducer, {skipPendingDelayMs: 400});

function Toto() {
  const {state, abort} = useAsyncState({
    source,
    events: {change: (e) => console.log("CHANGE EVENT", e.state)}
  });

  return (
    <div>
      <button onClick={() => source.run()}>run</button>
      <button onClick={() => abort()}>abort</button>
      <span>{state.timestamp}</span>
      <details open>
        <pre>{JSON.stringify(state, null, 4)}</pre>
      </details>
    </div>
  );
}

root.render(<React.StrictMode><Toto/></React.StrictMode>);
// root2.render(<Counter from="root2"/>);
initVanillaHost(vanillaHost);

counterSource.subscribe((newState) => {
  document.getElementById("vanilla-content").innerHTML = `<span>Counter value is ${newState.data}</span>`;
}, "vanilla-subscription");

function Counter({from}) {
  const {state} = useSource(counterSource);

  return (
    <div>
      <h1>{from}</h1>
      <button onClick={decrement}>-</button>
      <span>Counter value is {state.data}</span>
      <button onClick={increment}>+</button>
    </div>
  )
}

function MeTesting() {
  return <div>Hello, world!</div>
}


//
// const button = document.createElement("button");
// button.innerHTML = "Click me";
// button.onclick = function () {
//   console.log("Root created");
//   root.render(
//     <App/>
//   );
//   console.log("rendered root!");
//   Promise.resolve().then(() => console.log('promised did resolve !'));
//   setTimeout(() => console.log('timeout passed'));
// };
// document.body.appendChild(button);
//

// ReactDOM.render(
//   <React.StrictMode><App/></React.StrictMode>, document.getElementById('root'));

// const anotherRoot = document.createElement("div");
// document.body.appendChild(anotherRoot);
//
// ReactDOM.render(<App2/>, anotherRoot);
