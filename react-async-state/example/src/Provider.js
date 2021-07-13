import React from "react";
import { AsyncContextProvider } from 'react-async-state';

function curriedTimeout(delay) {
  return function curryImpl(...args) {
    return timeout(delay, ...args);
  }
}

function timeout(delay, ...resolveValues) {
  return new Promise(resolve => setTimeout(() => resolve(...resolveValues), delay));
}

const asyncStatesDemo = [
  {
    key: "users",
    promise(argv) {
      console.log('running promise with', argv)
      const controller = new AbortController();
      const {signal} = controller;
      argv.onAbort(function abortSignal() {
        controller.abort();
      });
      return fetch('https://jsonplaceholder.typicode.com/users', {signal})
        .then(curriedTimeout(1000))
        .then(res => res.json());
    },
    config: {
      lazy: false,
    }
  },
];

export default function DemoProvider({children}) {
  return <AsyncContextProvider initialAsyncStates={asyncStatesDemo}>{children}</AsyncContextProvider>;
}
