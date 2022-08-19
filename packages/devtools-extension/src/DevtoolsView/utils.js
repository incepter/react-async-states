import { newDevtoolsRequests } from "devtools/eventTypes";

export const DevtoolsMessagesBuilder = {
  init() {
    return {
      type: "init",
      source: "async-states-devtools-panel",
      tabId: window.chrome.devtools.inspectedWindow.tabId
    };
  },
  getKeys() {
    return {
      type: newDevtoolsRequests.getKeys,
      source: "async-states-devtools-panel",
      tabId: window.chrome.devtools.inspectedWindow.tabId
    };
  },
  getAsyncState(uniqueId) {
    return {
      uniqueId,
      source: "async-states-devtools-panel",
      type: newDevtoolsRequests.getAsyncState,
      tabId: window.chrome.devtools.inspectedWindow.tabId
    };
  }
}
