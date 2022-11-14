import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import {DevtoolsView} from "./DevtoolsView";

const isDev = process.env.NODE_ENV !== "production";
if (isDev) {
  // @ts-ignore
  window.chrome = {
    devtools: {
      inspectedWindow: {
        tabId: -1,
      },
    },
    runtime: {
      connect() {
        return {
          postMessage(msg) {
            console.log('posting messages', msg);
          },
          onMessage: {
            addListener(fn) {
              console.log('listener', fn);
            }
          }
        };
      },
    }
  };
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <DevtoolsView/>
  </React.StrictMode>
)
