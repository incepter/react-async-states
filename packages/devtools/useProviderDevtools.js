import React from "react";
import { __DEV__ } from "shared";
import devtools from "./index";
import { devtoolsRequests } from "./eventTypes";

export default function useProviderDevtools(entries) {
  if (!__DEV__) {
    return null;
  }

  React.useEffect(function waitForDevtoolsAndEmit() {
    function listener(message) {
      if (!message.data || message.data.source !== "async-states-devtools-panel") {
        return;
      }
      devtools.connect();
      if (message.data && message.data.type === devtoolsRequests.provider) {
        devtools.emitProviderState(entries);
      }
    }

    window && window.addEventListener("message", listener);

    return () => {
      devtools.disconnect();
      window && window.removeEventListener("message", listener);
    };
  }, [entries]);
}
