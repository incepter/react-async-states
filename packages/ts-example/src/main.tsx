import React from "react";
import ReactDOM from "react-dom/client";
// @ts-ignore
import DevtoolsView from "react-async-states/dist/devtools/view"
import EntryPoint from "./entryPoint";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <EntryPoint/>
    <DevtoolsView/>
  </React.StrictMode>
);
