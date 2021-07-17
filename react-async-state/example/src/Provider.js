import React from "react";
import { AsyncStateProvider } from 'react-async-state';

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
      const controller = new AbortController();
      const {signal} = controller;
      argv.onAbort(function abortSignal() {
        controller.abort();
      });
      let url = 'https://jsonplaceholder.typicode.com/users';
      if (argv.payload?.userId) {
        url += `/${argv.payload.userId}`;
      }
      return fetch(url, {signal})
        .then(curriedTimeout(1000))
        .then(res => res.json());
    },
    config: {
      lazy: false,
    }
  },
  {
    key: "posts",
    promise(argv) {
      const controller = new AbortController();
      const {signal} = controller;
      argv.onAbort(function abortSignal() {
        controller.abort();
      });
      return fetch('https://jsonplaceholder.typicode.com/posts', {signal})
        .then(curriedTimeout(1000))
        .then(res => res.json());
    },
    config: {
      lazy: false,
    }
  },
];

export default function DemoProvider({children}) {
  return <AsyncStateProvider initialAsyncStates={asyncStatesDemo}>{children}</AsyncStateProvider>;
}
function toto({ children }) {
  return (
    <AsyncStateProvider initialAsyncStates={ /* array of  {key, config, promise}*/ } payload={/* any */}>
      {children}
    </AsyncStateProvider>
  );
}
