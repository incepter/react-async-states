const port = window.chrome.runtime.connect({
  name: 'content-script',
});

chrome.runtime.onMessage.addListener(forwardFromBackgroundToPage);
window.addEventListener('message', forwardFromPageToBackground);

function forwardFromBackgroundToPage(message) {
  if (message.source !== "async-states-devtools-panel") {
    return;
  }
  window.postMessage(message, '*');
}

function forwardFromPageToBackground(event) {
  if (
    event.source === window &&
    event.data &&
    event.data.source === 'async-states-agent'
  ) {
    chrome.runtime.sendMessage(event.data);
  }
}
