import { DevtoolsRequest } from "react-async-states/dist/devtools";

export const DevtoolsMessagesBuilder = {
  init() {
    return {
      type: "init",
      source: "async-states-devtools-panel",
      tabId: (window as any).chrome.devtools.inspectedWindow.tabId
    };
  },
  getKeys() {
    return {
      type: DevtoolsRequest.getKeys,
      source: "async-states-devtools-panel",
      tabId: (window as any).chrome.devtools.inspectedWindow.tabId
    };
  },
  getAsyncState(uniqueId) {
    return {
      uniqueId,
      source: "async-states-devtools-panel",
      type: DevtoolsRequest.getAsyncState,
      tabId: (window as any).chrome.devtools.inspectedWindow.tabId
    };
  },
  changeAsyncState(uniqueId, status, data, isJson) {
    return {
      data,
      status,
      isJson,
      uniqueId,
      source: "async-states-devtools-panel",
      type: DevtoolsRequest.changeAsyncState,
      tabId: (window as any).chrome.devtools.inspectedWindow.tabId
    };
  },
}

export function addFormattedDate(obj, prop = "timestamp", newProp = "formattedTimestamp") {
  return {...obj, [newProp]: new Date(obj[prop]).toISOString()};
}
