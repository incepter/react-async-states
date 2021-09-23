import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import DevtoolsAsyncStatesProvider from "./core/DevtoolsAsyncStatesProvider";


const isDev = process.env.NODE_ENV !== "production";
if (isDev) {
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

ReactDOM.render(
  <React.StrictMode>
    <DevtoolsAsyncStatesProvider>
      <App/>
    </DevtoolsAsyncStatesProvider>
  </React.StrictMode>,
  document.getElementById('root')
);
