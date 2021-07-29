import React from "react";
import { useLocation, useParams } from "react-router-dom";
import { AsyncStateProvider } from 'react-async-state';

const asyncStatesDemo = [
  {
    key: "users",
    promise(argv) {

      console.log('AZRGV', argv)

      const controller = new AbortController();
      const {signal} = controller;
      argv.onAbort(function abortSignal() {
        controller.abort();
      });

      return fetch('https://jsonplaceholder.typicode.com/users', {signal})
        .then(res => res.json());
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
        .then(res => res.json());
    }
  },
];

export default function DemoProvider({children}) {
  const location = useLocation();
  const matchParams = useParams();

  const payload = React.useMemo(function getPayload() {
    return {location, matchParams};
  }, [matchParams, location]);

  return (
    <AsyncStateProvider payload={payload} initialAsyncStates={asyncStatesDemo}>
      {children}
    </AsyncStateProvider>
  );
}
