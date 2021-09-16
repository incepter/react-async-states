/**
 * when a message is received from content-script
 * we send it to the corresponding devtools port
 */
window.chrome.runtime.onMessage.addListener(onMessageFromContentScript); // content-script -> background (here) -> devtools
/**
 * when devtools is connected, we listen to messages from it
 * and send them to content-script
 * devtools -> background (here) -> content-script
 */
window.chrome.runtime.onConnect.addListener(onDevtoolsConnect);


let ports = {};

function onMessageFromContentScript(message, sender) {
  const port = sender.tab && sender.tab.id !== undefined && ports[sender.tab.id];
  if (port) {
    port.postMessage(message);
  }
  return true;
}

function onDevtoolsConnect(port) {
  port.onMessage.addListener(onMessageFromDevtools); // devtools -> background (here) -> content-script
  port.onDisconnect.addListener(onDevtoolsDisconnect);

  let tabId;

  function onMessageFromDevtools(message) {
    if (message.source !== "async-states-devtools-panel") {
      return;
    }
    if (message.type === "init") {
      if (tabId && ports[tabId]) {
        onDevtoolsDisconnect();
      }
      tabId = message.tabId;
      ports[tabId] = port;
      return;
    }
    if (!tabId) {
      return;
    }
    if (ports[tabId]) {
      chrome.tabs.sendMessage(tabId, message);
    }
  }

  function onDevtoolsDisconnect() {
    delete ports[tabId];
  }
}

chrome.runtime.onInstalled.addListener(detail => {
  console.log("On Installed", detail);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    chrome.tabs.sendMessage(tabId, {
      type: "get-provider-state",
      source: "async-states-devtools-panel"
    });
  }
});
