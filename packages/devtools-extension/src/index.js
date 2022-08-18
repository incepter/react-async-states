import React from 'react';
import ReactDOM from 'react-dom';
import "./index.v2.css";
import { toDevtoolsEvents } from "devtools/eventTypes";
import { DevtoolsV2 } from "./v2";


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
    <DevtoolsV2/>
  </React.StrictMode>,
  document.getElementById('root')
);
