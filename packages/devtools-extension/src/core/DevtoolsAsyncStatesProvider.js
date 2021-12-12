import React from "react";
import { AsyncStateProvider } from "react-async-states";
import { DevtoolsAsyncStates } from "../DevtoolsAsyncStates";
import { mapmock } from "./dev";

const initialDevtools = process.env.NODE_ENV === "production" ? {} : mapmock;

const globalAsyncState = {
  key: "devtools",
  initialValue: DevtoolsAsyncStates(initialDevtools),
  producer(props) {
    const {data} = props.lastSuccess;
    data.applyMessage(props.args[0]);
    console.log('running producer', props.args[0], props.args[0].payload.eventType, props.args[0].payload.eventPayload, data);
    return data;
  }
};

const initialAsyncStates = [globalAsyncState];

export default function DevtoolsAsyncStatesProvider({children}) {
  return (<AsyncStateProvider initialAsyncStates={initialAsyncStates}>{children}</AsyncStateProvider>);
}
