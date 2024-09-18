chrome.runtime.onMessage.addListener(onMessageFromBackground); // background -> content-script (here) -> page
window.addEventListener("message", onMessageFromPage); // page -> content-script (here) -> background

function onMessageFromBackground(message) {
  if (message.source !== "async-states-devtools-panel") {
    return;
  }
  window.postMessage(message, "*");
}

function onMessageFromPage(event) {
  // page -> content-script (here) -> background
  if (
    event.source === window &&
    event.data &&
    event.data.source === "async-states-agent"
  ) {
    chrome.runtime.sendMessage(event.data);
  }
}
