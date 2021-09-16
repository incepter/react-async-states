import React from "react";
import { __DEV__ } from "../shared";
import devtools from "./devtools";
import { devtoolsRequests } from "./eventTypes";

export default function useProviderDevtools(entries) {
  if (!__DEV__) {
    return null;
  }

  React.useLayoutEffect(function waitForDevtoolsAndEmit() {
    console.log('provider effect');
    function listener(message) {
      if (message.data?.source !== "async-states-devtools-panel" || message.data?.type !== devtoolsRequests.provider) {
        return;
      }
      if (message.data?.source === "async-states-devtools-panel" && message.data?.type === devtoolsRequests.connect) {
        devtools.connect();
      }

      devtools.emitProviderState(entries);
      console.log('________', message.data);
    }
    window.addEventListener("message", listener)

    return () => {
      devtools.disconnect();
      window.removeEventListener("message", listener);
    };
  }, [entries]);
}
