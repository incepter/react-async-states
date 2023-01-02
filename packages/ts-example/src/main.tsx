import React from "react";
import ReactDOM from "react-dom/client";

import EntryPoint from "./entryPoint";
import "./styles/index.css";
import {createSource} from "react-async-states";

import {autoConfigureDevtools} from "async-states-devtools"
import "async-states-devtools/dist/style.css"
autoConfigureDevtools({open: false});

// const src = createSource("demo", null, {initialValue: 0});
//
// src.setState(old => old.data + 1)


ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <EntryPoint/>
  </React.StrictMode>
);
