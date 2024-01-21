"use client";

import * as React from "react";
import {Suspense} from "react";
import {useAsync, useData} from "react-async-states";

import {ProducerProps} from "async-states";

let isServer = typeof window === "undefined" || "Deno" in window;

async function fetchUsers({
  signal,
  args,
}: ProducerProps<{ username: string }, [number, number], Error>) {
  let [value, delay] = args;
  // artificially delayed
  await new Promise((res) => setTimeout(res, delay/10));
  return await fetch(`https://jsonplaceholder.typicode.com/users/${value}`, {
    signal,
  }).then((res) => res.json());
}
function Comp({ value, delay = 2000, useA = false }) {
  let useHook = useA ? useAsync : useData;
  console.log('1. rendering comp', value)
  // @ts-ignore
  let { data, state: {status} } = useHook(
    {
      lazy: false,
      key: `user-${value}`,
      producer: fetchUsers,
      autoRunArgs: [value, delay],
      condition: (isServer && value !== 5) || value === 5,
    },
    [value, delay],
  );
  console.log('2. rendering comp', value, status)
  return (
    <span>
      {value}-{data?.username}-{delay}-{status}
    </span>
  );
}

export default function UserDetails() {
  useAsync({
    key: `user-5`,
    initialValue: { username: "fake username -- will be rendered in client" },
  });
  return (
    <div>
      <Suspense fallback="Waiting...">
        <Comp value={1} delay={100} />
      </Suspense>
      <hr />
      <Suspense fallback="Waiting...">
        <Comp value={2} delay={6000} />
      </Suspense>
      <hr />
      <Suspense fallback="Waiting...">
        <Comp value={3} delay={7000} />
      </Suspense>
      <hr />
      <Suspense fallback="Waiting...">
        <Comp useA value={5} delay={5000} />
      </Suspense>
      <hr />
      <Suspense fallback="Waiting...">
        <Comp useA value={5} delay={5000} />
      </Suspense>
    </div>
  );
}
