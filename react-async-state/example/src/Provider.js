import React from "react";
import { useLocation } from "react-router-dom";
import { AsyncStateProvider } from 'react-async-state';

export const demoAsyncStates = {
  users: {
    key: "users",
    promise(argv) {
      const controller = new AbortController();
      const {signal} = controller;
      argv.onAbort(function abortSignal() {
        controller.abort();
      });

      return fetch('https://jsonplaceholder.typicode.com/users', {signal})
        .then(res => res.json());
    },
    promiseConfig: {lazy: true}
  },
  posts: {
    key: "posts",
    promise(argv) {
      const controller = new AbortController();
      const {signal} = controller;
      argv.onAbort(function abortSignal() {
        controller.abort();
      });

      return fetch('https://jsonplaceholder.typicode.com/posts', {signal})
        .then(res => res.json());
    }
  },
  getUser: {
    key: "get-user",
    promise(argv) {
      const controller = new AbortController();
      const {signal} = controller;
      argv.onAbort(function abortSignal() {
        controller.abort();
      });

      return fetch(`https://jsonplaceholder.typicode.com/users/${argv.payload?.matchParams?.userId}`, {signal})
        .then(res => res.json());
    }
  },
}
const asyncStatesDemo = Object.values(demoAsyncStates);

export default function DemoProvider({children}) {
  const location = useLocation();

  const payload = React.useMemo(function getPayload() {
    return {location};
  }, [location]);

  return (
    <AsyncStateProvider payload={payload} initialAsyncStates={asyncStatesDemo}>
      {children}
    </AsyncStateProvider>
  );
}
