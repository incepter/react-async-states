import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import DevModeApp from "./DevModeApp";
import {__DEV__} from "./utils";
import {AutoConfiguredDevtools, autoConfigureDevtools} from "./index";

autoConfigureDevtools({open: true});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <div style={{height: "100vh"}}>
      {__DEV__ && <>
        <DevModeApp/>
        <hr/>
      </>
      }
      {/*<AutoConfiguredDevtools/>*/}
    </div>
  </React.StrictMode>
)
