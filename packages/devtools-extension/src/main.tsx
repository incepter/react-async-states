import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import {DevtoolsView} from "./DevtoolsView";
import {shimChromeRuntime} from "./DevtoolsView/ShimChromeRuntime";
import DevModeApp from "./DevModeApp";

const isDev = process.env.NODE_ENV !== "production";
if (isDev) {
  let shim = shimChromeRuntime();
  if (shim) {
    // @ts-ignore
    window.chrome = shim;
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {isDev && <>
      <DevModeApp/>
      <hr/>
    </>
    }
    <DevtoolsView/>
  </React.StrictMode>
)
