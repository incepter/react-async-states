import React from "react";
import { AsyncStateProvider } from "react-async-states";
import { DevtoolsAsyncStates } from "../DevtoolsAsyncStates";
import { mapmock } from "./dev";
import { toDevtoolsEvents } from "devtools/eventTypes";

const initialDevtools = process.env.NODE_ENV === "production" ? {} : mapmock;

const globalAsyncState = {
  key: "devtools",
  initialValue: DevtoolsAsyncStates(initialDevtools),
  producer(props) {
    const message = props.args[0];
    const {data} = props.lastSuccess;
    if (message.type === toDevtoolsEvents.flush) {
      return DevtoolsAsyncStates(initialDevtools)
    }
    data.applyMessage(message);
    return data;
  }
};

const initialAsyncStates = [globalAsyncState];

export default function DevtoolsAsyncStatesProvider({children}) {
  return (<AsyncStateProvider initialStates={initialAsyncStates}>{children}</AsyncStateProvider>);
}
