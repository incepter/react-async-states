let tabPorts = {};
// Receive message from content script and relay to the devTools page for the
// current tab
/*
 * agent -> content-script.js -> **background.js** -> dev tools
 */
chrome.runtime.onMessage.addListener((message, sender) => {
  console.log("background->message", message);
  const port = sender.tab && sender.tab.id !== undefined && tabPorts[sender.tab.id];
  if (port) {
    console.log("background->port", port);
    port.postMessage(message);
  } else {
  }
  return true;
});

/*
 * agent <- content-script.js <- **background.js** <- dev tools
 */
chrome.runtime.onConnect.addListener(port => {
  console.log('ON CONNECT - bg.js');
  let tabId;
  port.onMessage.addListener(message => {
    console.log('bg.js, onConnect, onMessage,', message);
    if (message.name === "init") {
      // set in devtools.ts
      if (!tabId) {
        // this is a first message from devtools so let's set the tabId-port mapping
        tabId = message.tabId;
        tabPorts[tabId] = port;
      }
    }
    if (message.name && message.name === "action" && message.data) {
      const conn = tabPorts[tabId];
      if (conn) {
        console.log("background->contentScript", message);
        chrome.tabs.sendMessage(tabId, message);
      }
    }
  });

  port.onDisconnect.addListener(() => {
    delete tabPorts[tabId];
  });
});


chrome.runtime.onInstalled.addListener(detail => {
  console.log("On Installed", detail);
});
