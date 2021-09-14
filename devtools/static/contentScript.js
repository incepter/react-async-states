/*
* agent -> **content-script.js** -> background.js -> dev tools
*/
window.addEventListener("message", (event) => {
  // Only accept messages from the same frame
  if (event.source !== window) {
    return;
  }

  const message = event.data;

  // Only accept messages that we know are ours
  if (typeof message !== "object" || message === null ||
    !!message.source && message.source !== "async-states-agent") {
    return;
  }
  if (chrome.runtime && !!chrome.runtime.getManifest()) {
    chrome.runtime.sendMessage(message);
  } else {
    console.log("Cannot send the message because of the Chrome Runtime manifest not available")
  }
});



/*
 * agent <- **content-script.js** <- background.js <- dev tools
 */
chrome.runtime.onMessage.addListener((request) => {
  request.source = 'dataaccessgateway-devtools';
  window.postMessage(request, '*');
});
