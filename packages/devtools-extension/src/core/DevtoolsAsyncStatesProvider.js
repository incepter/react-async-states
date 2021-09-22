import React from "react";
import { AsyncStateProvider } from "react-async-states";
import { DevtoolsAsyncStates } from "../DevtoolsAsyncStates";

const globalAsyncState = {
  lazy: true,
  key: "devtools",
  initialValue: DevtoolsAsyncStates({
    1: {
      key: "holla",
      state: {status: "pending", data: null, args: null},
      lastSuccess: {status: "success", data: 2, args: null},
      isInsideProvider: true,
      subscriptions: ["sub1"],
      journal: [
        {uniqueId: 1, key: "holla", eventType: "creation", eventPayload: {}},
        {uniqueId: 1, key: "holla", eventType: "creation", eventPayload: {}},
        {uniqueId: 1, key: "holla", eventType: "creation", eventPayload: {}},
        {uniqueId: 1, key: "holla", eventType: "creation", eventPayload: {}},
      ],
    },
    2: {
      key: "holla 2",
      state: {status: "pending", data: null, args: null},
      lastSuccess: {status: "success", data: 2, args: null},
      isInsideProvider: true,
      subscriptions: ["sub1"],
      journal: [
        {uniqueId: 1, key: "holla", eventType: "creation", eventPayload: {}},
      ],
    }
  }),
  promise(argv) {
    const {data} = argv.lastSuccess;
    data.applyMessage(argv.executionArgs[0]);
    console.log('running promise', argv, data);
    return data;
  }
};

const initialAsyncStates = [globalAsyncState];

export default function DevtoolsAsyncStatesProvider({children}) {
  return (<AsyncStateProvider initialAsyncStates={initialAsyncStates}>{children}</AsyncStateProvider>);
}
