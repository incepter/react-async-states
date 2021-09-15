/**
 * global chrome
 */
import React from "react";


function App() {
  const [providerState, setProviderState] = React.useState();
  const port = React.useRef();
  React.useEffect(() => {
    port.current = window.chrome.runtime.connect({
      name: "panel"
    });
    console.log('port', port.current)

    port.current.postMessage({
      name: "init",
      source: "async-states-devtools-panel",
      tabId: window.chrome.devtools.inspectedWindow.tabId
    });
    port.current.onMessage.addListener(message => {
      if (message.source === "async-states-agent") {
        if (message.eventType === 6) {
          setProviderState(message.payload);
        }
        console.log("*__message__from__agent*", message.eventType, message.payload);
      }
    });

    port.current.postMessage({
      name: "ping",
      type: "request-provider",
      payload: {hello: "devtools_open"},
      source: "async-states-devtools-panel"
    });
  }, []);


  return (
    <div>
      <header>
        {!providerState && <p>
          Hello
        </p>}
        {providerState && (
          <pre>
            {JSON.stringify(providerState, null, "  ")}
          </pre>
        )}
      </header>
    </div>
  );
}

export default App;

