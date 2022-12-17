import {DevtoolsRequest} from "react-async-states/dist/es/core/src/devtools";

export const DevtoolsMessagesBuilder = {
  init(dev: boolean) {
    return {
      type: "init",
      source: "async-states-devtools-panel",
      tabId: dev ? -1 : (window as any).chrome.devtools.inspectedWindow.tabId
    };
  },
  getKeys(dev: boolean) {
    return {
      type: DevtoolsRequest.getKeys,
      source: "async-states-devtools-panel",
      tabId: dev ? -1 : (window as any).chrome.devtools.inspectedWindow.tabId
    };
  },
  getAsyncState(uniqueId, dev?: boolean) {
    return {
      uniqueId,
      source: "async-states-devtools-panel",
      type: DevtoolsRequest.getAsyncState,
      tabId: dev ? -1 : (window as any).chrome.devtools.inspectedWindow.tabId
    };
  },
  changeAsyncState(uniqueId, status, data, isJson, dev?: boolean) {
    return {
      data,
      status,
      isJson,
      uniqueId,
      source: "async-states-devtools-panel",
      type: DevtoolsRequest.changeAsyncState,
      tabId: dev ? -1 : (window as any).chrome.devtools.inspectedWindow.tabId
    };
  },
}

export function addFormattedDate(
  obj, prop = "timestamp", newProp = "formattedTimestamp") {
  return {...obj, [newProp]: new Date(obj[prop]).toISOString()};
}
