import React from "react";
import { AsyncStateProvider } from "react-async-states";
import { DevtoolsAsyncStates } from "../DevtoolsAsyncStates";
import { mapmock } from "./dev";

const initialDevtools = process.env.NODE_ENV === "production" ? {} : mapmock;

const globalAsyncState = {
  key: "devtools",
  initialValue: DevtoolsAsyncStates(initialDevtools),
  promise(argv) {
    const {data} = argv.lastSuccess;
    data.applyMessage(argv.executionArgs[0]);
    console.log('running promise', argv.executionArgs[0], argv.executionArgs[0].payload.eventType, argv.executionArgs[0].payload.eventPayload, data);
    return data;
  }
};

const initialAsyncStates = [globalAsyncState];

export default function DevtoolsAsyncStatesProvider({children}) {
  return (<AsyncStateProvider initialAsyncStates={initialAsyncStates}>{children}</AsyncStateProvider>);
}
