import React from "react";
import { AsyncContextProvider } from 'react-async-state';

function timeout(delay, ...resolveValues) {
  return new Promise(resolve => setTimeout(() => resolve(...resolveValues), delay));
}

const asyncStatesDemo = [
  {
    key: "users",
    promise(argv) {
      const controller = new AbortController();
      const {signal} = controller;
      argv.onAbort(function abortSignal() {
        controller.abort();
      });
      return timeout(1000)
        .then(() => fetch('https://jsonplaceholder.typicode.com/users', {signal}))
        .then(res => res.json());
    }
  },
];

export default function DemoProvider({children}) {
  return <AsyncContextProvider initialAsyncStates={asyncStatesDemo}>{children}</AsyncContextProvider>;
}
