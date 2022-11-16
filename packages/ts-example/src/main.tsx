import React from "react";
import ReactDOM from "react-dom/client";
// @ts-ignore
import DevtoolsView from "react-async-states/dist/devtools/view"
import EntryPoint from "./entryPoint";
import "./styles/index.css";
import {createSource, useSource} from "react-async-states";

const counterSource = createSource("counter", null, {initialValue: 0});
export default function DevModeApp() {
  const {state} = useSource(counterSource);
  return (
    <div>
      <hr/>
      <button
        onClick={() => counterSource.run(old => old.data + 1)}>{state.data}</button>
      <hr/>
    </div>
  )
}


ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <EntryPoint/>
    <DevModeApp/>
    <DevtoolsView/>
  </React.StrictMode>
);
