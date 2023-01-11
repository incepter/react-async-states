import React from "react";
import ReactDOM from "react-dom/client";

import {autoConfigureDevtools} from "async-states-devtools"
import "async-states-devtools/dist/style.css"
autoConfigureDevtools({open: false});

import EntryPoint from "./entryPoint";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <EntryPoint/>
  </React.StrictMode>
);
