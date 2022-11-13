import { devtoolsRequests } from "devtools/eventTypes";

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
      type: devtoolsRequests.getKeys,
      source: "async-states-devtools-panel",
      tabId: window.chrome.devtools.inspectedWindow.tabId
    };
  },
  getAsyncState(uniqueId) {
    return {
      uniqueId,
      source: "async-states-devtools-panel",
      type: devtoolsRequests.getAsyncState,
      tabId: window.chrome.devtools.inspectedWindow.tabId
    };
  },
  changeAsyncState(uniqueId, status, data, isJson) {
    return {
      data,
      status,
      isJson,
      uniqueId,
      source: "async-states-devtools-panel",
      type: devtoolsRequests.changeAsyncState,
      tabId: window.chrome.devtools.inspectedWindow.tabId
    };
  },
}

export function addFormattedDate(obj, prop = "timestamp", newProp = "formattedTimestamp") {
  return {...obj, [newProp]: new Date(obj[prop]).toISOString()};
}
