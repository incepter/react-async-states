import React from "react";

let dictionary = {};

function App() {
  const rerender = React.useState()[1];
  const port = React.useRef();
  React.useEffect(() => {
    port.current = window.chrome.runtime.connect({
      name: "panel"
    });
    console.log('port', port.current)

    port.current.postMessage({
      type: "init",
      source: "async-states-devtools-panel",
      tabId: window.chrome.devtools.inspectedWindow.tabId
    });

    port.current.onMessage.addListener(message => {
      console.log("*__message__from__agent*", message.type, message.payload);
      if (message.source === "async-states-agent") {
        if (message.type === "sync-provider") {
          dictionary = {...dictionary, ...message.payload}
          rerender({});
        }
        if (message.type === "async-state-information") {
          const {payload} = message;
          dictionary[payload.key] = payload;
          rerender({});
        }
      }
    });

    port.current.postMessage({
      type: "get-provider-state",
      source: "async-states-devtools-panel"
    });
  }, []);

  const entries = Object.entries(dictionary);

  return (
    <div style={{color: "white"}}>
      <header>
        {!entries.length && <p>
          Hello
        </p>}
        {entries && (
          <div style={{display: "flex"}}>
            {entries.map(([key, value]) => (
              <div style={{padding: "1rem", maxWidth: 300}}>
                <div style={{border: "1px solid white", borderRadius: "1rem", padding: "1rem", color: "white"}}>
                  <span>key: {key}</span><br/>
                  <details>
                    <div style={{paddingLeft: "1rem"}}>
                      <span>state: <details>{JSON.stringify(value.state, null, "  ")}</details></span><br/>
                      <span>lastSuccess: <details>{JSON.stringify(value.lastSuccess, null, "  ")}</details></span><br/>
                      <span>subscribers({value.subscriptions.length}): {value.subscriptions.join(',')}</span>
                    </div>
                  </details>
                </div>
              </div>
            ))}
          </div>
        )}
      </header>
    </div>
  );
}

export default App;

