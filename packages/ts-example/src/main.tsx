import React from "react";
import ReactDOM from "react-dom/client";

import {createSource, Status, enableDiscovery} from "react-async-states";
enableDiscovery();

import {autoConfigureDevtools} from "async-states-devtools"
import "async-states-devtools/dist/style.css"
autoConfigureDevtools({open: false});

import EntryPoint from "./entryPoint";
import "./styles/index.css";


let c = createSource("cc", undefined, undefined, "haha");
let cc = createSource("cc", undefined, undefined, "haha");
let ccc = createSource("cc", undefined, undefined, "haha");

console.log('==>', c.uniqueId,ccc.uniqueId, cc.uniqueId);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <EntryPoint/>
  </React.StrictMode>
);
