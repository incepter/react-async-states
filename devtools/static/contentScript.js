/**
 * When background sends a message, forward it to page
 */
chrome.runtime.onMessage.addListener(onMessageFromBackground); // background -> content-script (here) -> page
/**
 * When page emits a message from our agent, forward it to background
 */
window.addEventListener('message', onMessageFromPage); // page -> content-script (here) -> background

function onMessageFromBackground(message) {
  // devtools panel is the only allowed to talk to content-script
  if (message.source !== "async-states-devtools-panel") {
    return;
  }
  window.postMessage(message, '*');
}

function onMessageFromPage(event) { // page -> content-script (here) -> background
  if (
    event.source === window &&
    event.data &&
    event.data.source === 'async-states-agent'
  ) {
    chrome.runtime.sendMessage(event.data);
  }
}
