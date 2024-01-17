"use client";

import * as React from "react";
import { Suspense } from "react";
import { useAsync, useData } from "react-async-states";

import { ProducerProps } from "async-states";

async function fetchUsers({
  signal,
  args,
}: ProducerProps<{ username: string }, [number, number], Error>) {
  let [value, delay] = args;
  // artificially delayed by 500ms
  await new Promise((res) => setTimeout(res, delay));
  return await fetch(`https://jsonplaceholder.typicode.com/users/${value}`, {
    signal,
  }).then((res) => res.json());
}
function Comp({ value, delay = 2000, useA = false }) {
  let useHook = useA ? useAsync : useData;
  // @ts-ignore
  let { data } = useHook(
    {
      lazy: false,
      key: `user-${value}`,
      producer: fetchUsers,
      autoRunArgs: [value, delay],
      condition: (state) => state.status !== "success",
    },
    [value, delay],
  );
  return <span>{data!.username}</span>;
}

export default function UserDetails() {
  useAsync({
    key: `user-5`,
    initialValue: { username: "tototototo" },
  });
  return (
    <div>
      <Suspense fallback="hhh...">
        <Comp value={2} delay={100} />
      </Suspense>
      <hr />
      <Suspense fallback="hhh...">
        <Comp value={3} delay={1000} />
      </Suspense>
      <hr />
      <Suspense fallback="hhh...">
        <Comp value={4} delay={200} />
      </Suspense>
      <hr />
      <Suspense fallback="hhh...">
        <Comp useA value={5} delay={2000} />
      </Suspense>
      <hr />
      <Suspense fallback="hhh...">
        <Comp useA value={5} delay={3000} />
      </Suspense>
      <hr />
      <Suspense fallback="hhh...">
        <Comp value={6} delay={4000} />
      </Suspense>
      <hr />
      <Suspense fallback="hhh...">
        <Comp value={8} delay={6000} />
      </Suspense>
    </div>
  );
}
