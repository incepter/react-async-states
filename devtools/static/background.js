chrome.runtime.onMessage.addListener(forwardToContentScriptFromBackground);
chrome.runtime.onConnect.addListener(forwardToBackgroundFromDevtools);

let ports = {};

function forwardToContentScriptFromBackground(message, sender) {
  const port = sender.tab && sender.tab.id !== undefined && ports[sender.tab.id];
  console.log('sending to devtools from background', message, sender?.tab?.id, ports[sender?.tab?.id], sender);
  if (port) {
    port.postMessage(message);
  }
  return true;
}

function forwardToBackgroundFromDevtools(port) {
  let tabId;
  port.onMessage.addListener(message => {
    if (message.source !== "async-states-devtools-panel") {
      return;
    }
    if (message.name === "init") {
      if (tabId && ports[tabId]) {
        ports[tabId].disconnect?.();
        delete ports[tabId];
      }
      tabId = message.tabId;
      ports[tabId] = port;
      return;
    }
    if (!tabId) {
      return;
    }
    console.log('sending to', tabId, message);
    if (ports[tabId]) {
      chrome.tabs.sendMessage(tabId, message);
    }
  });

  port.onDisconnect.addListener(() => {
    delete ports[tabId];
  });
}

chrome.runtime.onInstalled.addListener(detail => {
  console.log("On Installed", detail);
});
