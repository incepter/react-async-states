import React from "react";
import { useLocation } from "react-router-dom";
import { AsyncStateBuilder, AsyncStateProvider } from 'react-async-states';
import { getUserPromise, postsPromise, timeoutPromise, usersPromise } from "./promises";

export const demoAsyncStates = {
  timeout: AsyncStateBuilder()
    .key("timeout")
    .lazy(false)
    .promise(timeoutPromise(4000))
    .build(),

  users: AsyncStateBuilder()
    .key("users")
    .lazy(false)
    .promise(usersPromise)
    .build(),

  posts: AsyncStateBuilder()
    .key("posts")
    .promise(postsPromise)
    .build(),

  getUser: AsyncStateBuilder() // {key, promise, lazy=true, initialValue=null}
    .key("get-user")
    .lazy(false)
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
