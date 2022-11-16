import {resetAllSources} from "./sources";

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
        let listener = spyOnMessagesFromCurrentPage.bind(null, listeners);
        (window as any).addEventListener("message", listener);
        return {
          postMessage(msg) {
            window.postMessage(msg);
            console.log('posting messages', msg);
          },
          onMessage: {
            addListener(fn) {
              listeners?.push(fn);
            }
          },
          onDisconnect() {
            listeners = null;
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
    listeners?.forEach?.(fn => fn(message.data));
  }
}
