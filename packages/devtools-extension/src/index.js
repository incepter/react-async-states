import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import DevtoolsAsyncStatesProvider from "./core/DevtoolsAsyncStatesProvider";
import { toDevtoolsEvents } from "devtools/eventTypes";


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

export let allMessages = [];
const source = "async-states-agent";
function Wrapper({children}) {
  const [visible, setVisible] = React.useState(true);

  function handler() {
    setVisible(old => !old);
    window.postMessage({
      source,
      type: toDevtoolsEvents.flush,
    });
  }

  return (
    <div>
      <button onClick={handler}>{visible ? "unmount" : "mount"}</button>
      {visible && children}
    </div>
  )
}

ReactDOM.render(
  <React.StrictMode>
    <DevtoolsAsyncStatesProvider>
      <Wrapper>
        <App/>
      </Wrapper>
    </DevtoolsAsyncStatesProvider>
  </React.StrictMode>,
  document.getElementById('root')
);
