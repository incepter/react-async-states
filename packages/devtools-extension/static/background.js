/**
 * when a message is received from content-script
 * we send it to the corresponding devtools port
 */
chrome.runtime.onMessage.addListener(onMessageFromContentScript); // content-script -> background (here) -> devtools
/**
 * when devtools is connected, we listen to messages from it
 * and send them to content-script
 * devtools -> background (here) -> content-script
 */
chrome.runtime.onConnect.addListener(onDevtoolsConnect);


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
    console.log('background script!', message, tabId, ports);
    if (message.type === "init") {
      console.log('background received init message');
      if (tabId && ports[tabId]) {
        onDevtoolsDisconnect();
      }
      tabId = message.tabId;
      ports[tabId] = port;
    }
    if (!tabId) {
      console.log('tabId return!!', tabId);
      return;
    }
    console.log('bg', ports);
    if (ports[tabId]) {
      console.log('sending message to tab', message);
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

  console.log('extension updated!', tabId, changeInfo, tab);
  if (changeInfo.status === "complete") {
    chrome.tabs.sendMessage(tabId, {
      type: "init",
      source: "async-states-devtools-panel"
    });
  }
});
