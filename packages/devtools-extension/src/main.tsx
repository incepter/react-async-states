import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import DevModeApp from "./DevModeApp";
import {__DEV__} from "./utils";
import {DevtoolsView} from "./DevtoolsView";

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {__DEV__ && <>
      <DevModeApp/>
      <hr/>
    </>
    }
    <DevtoolsView  />
  </React.StrictMode>
)
