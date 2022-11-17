import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import DevModeApp from "./DevModeApp";
import {__DEV__} from "./utils";
import {AutoConfiguredDevtools, autoConfigureDevtools} from "./index";

autoConfigureDevtools();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <div style={{height: "100vh", backgroundColor: 'gray'}}>
      {__DEV__ && <>
        <DevModeApp/>
        <hr/>
      </>
      }
      {/*<AutoConfiguredDevtools/>*/}
    </div>
  </React.StrictMode>
)
