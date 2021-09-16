import React from "react";
import { __DEV__ } from "../shared";
import devtools from "./index";

export default function useProviderDevtools(entries) {
  if (!__DEV__) {
    return null;
  }

  React.useEffect(function waitForDevtoolsAndEmit() {
    console.log('provider effect');
    function listener(message) {
      if (message.data?.source !== "async-states-devtools-panel" || message.data?.type !== "request-provider") {
        return;
      }
      devtools.emitProvider(entries);
      console.log('________', message.data);
    }
    window.addEventListener("message", listener)

    return () => window.removeEventListener("message", listener);

  }, [entries]);
}
