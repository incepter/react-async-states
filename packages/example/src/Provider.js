import React from "react";
import { useLocation } from "react-router-dom";
import { AsyncStateBuilder, AsyncStateProvider, createSource } from 'react-async-states';
import { getUserProducer, postsProducer, timeoutProducer, usersProducer } from "./producers";

export const demoAsyncStates = {
  timeout: AsyncStateBuilder()
    .key("timeout")
    .producer(timeoutProducer(4000))
    .build(),

  users: createSource("users", usersProducer, {runEffect: "throttle", runEffectDurationMs: 1}),

  posts: AsyncStateBuilder()
    .key("posts")
    .producer(postsProducer)
    .build(),

  getUser: AsyncStateBuilder() // {key, producer, initialValue=null}
    .key("get-user")
    .producer(getUserProducer)
    .build()
  ,
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
