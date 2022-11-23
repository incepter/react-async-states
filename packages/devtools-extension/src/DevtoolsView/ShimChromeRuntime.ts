import {resetAllSources} from "./sources";

let shimId = 0;

export function shimChromeRuntime() {
  return {
    devtools: {
      inspectedWindow: {
        tabId: -1,
      },
    },
    runtime: {
      connect(_argv: any) {
        let listeners: Function[] | null = [];
        let listener = spyOnMessagesFromCurrentPage.bind(null, () => listeners);
        (window as any).addEventListener("message", listener);
        return {
          listeners,
          id: ++shimId,
          postMessage(msg) {
            window.postMessage(msg);
          },
          onMessage: {
            addListener(fn) {
              listeners?.push(fn);
            }
          },
          onDisconnect() {
            listeners = [];
            resetAllSources();
            (window as any).addEventListener("message", listener);
          }
        };
      },
    }
  };
}

function spyOnMessagesFromCurrentPage(listeners, message) {
  if (message.data?.source === 'async-states-agent') {
    listeners()?.forEach?.(fn => fn(message.data));
  }
}
