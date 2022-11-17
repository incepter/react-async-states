import React from "react";
import ReactDOM from "react-dom/client";
import {autoConfigureDevtools} from "async-states-devtools"

import EntryPoint from "./entryPoint";
import "./styles/index.css";
import {createSource} from "react-async-states/src";

autoConfigureDevtools({open: true});

createSource("demo", null, {initialValue: 0});


ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <EntryPoint/>
  </React.StrictMode>
);
