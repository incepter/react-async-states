import {Route, Navigate, LoaderFunction} from "react-router-dom";
import Welcome from "../components/welcome";
import PublicLayout from "../layouts/publicLayout";
import User from "../pages/user";
import UserList from "../pages/users";
import ROUTES from "./routes";
import {ProducerConfig, ProducerProps, State} from "async-states";
import {API} from "../api";

type Users = {}

import {Sources} from "async-states";
import React from "react";

// function createLoaderOrAction<T, E, R, P>(
//   key, producer?, config?: ProducerConfig<T, E, R>) {
//   // args: {params, request}
//   return async function loader(args): Promise<State<T, E, R>> {
//     let src = Sources.for(key, producer, config);
//     return await src.runp(args);
//   }
// }

let createLoaderOrAction = (key, producer?, config?) => (args) => Sources.for(key, producer, config).runp(args);

const AppRoutes = (
  <Route path={ROUTES.DEFAULT} element={<PublicLayout/>}>
    <Route index element={<Welcome/>}/>
    <Route path={ROUTES.USERS}>
      <Route index element={<UserList/>}
             loader={createLoaderOrAction("users", fetchUsers)}
             action={createLoaderOrAction("add-user", fetchUsers)}/>
      <Route path={ROUTES.USER} element={<UserDetails/>}
             // loader={createLoaderOrAction("user", fetchUser)}
             action={createLoaderOrAction("patch-user", patchUser)}/>
    </Route>
    <Route path={ROUTES.ANY} element={<Navigate to={ROUTES.USERS} replace/>}/>
  </Route>
);

function UserDetails() {
  return (
    <React.Suspense>
      <User/>
    </React.Suspense>
  )
}


function fetchUser(props: ProducerProps<Users>) {
  let [{params: {id}}] = props.args;
  if (!id) {
    throw new Error("Id is required");
  }
  let controller = new AbortController();
  props.onAbort(() => controller.abort());

  return API.get(`/users/${id}`, {signal: controller.signal});
}

function patchUser(props: ProducerProps<Users>) {
  let [{params: {id}, request}] = props.args;
  if (!id) {
    throw new Error("Id is required");
  }
  let controller = new AbortController();
  props.onAbort(() => controller.abort());

  return API.post(`/users/${id}`, {
    signal: controller.signal,
    body: request.body
  });
}

function fetchUsers(props: ProducerProps<Users>) {
  let controller = new AbortController();
  props.onAbort(() => controller.abort());

  return API.get("/users", {signal: controller.signal});
}

export default AppRoutes;
