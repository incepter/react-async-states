import React from "react";
import { useLocation } from "react-router-dom";
import { AsyncStateBuilder, AsyncStateProvider, createSourceAsyncState } from 'react-async-states';
import { getUserPromise, postsPromise, timeoutPromise, usersPromise } from "./promises";

export const demoAsyncStates = {
  timeout: AsyncStateBuilder()
    .key("timeout")
    .promise(timeoutPromise(4000))
    .build(),

  users: createSourceAsyncState("users", usersPromise),

  posts: AsyncStateBuilder()
    .key("posts")
    .promise(postsPromise)
    .build(),

  getUser: AsyncStateBuilder() // {key, promise, initialValue=null}
    .key("get-user")
    .promise(getUserPromise)
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
