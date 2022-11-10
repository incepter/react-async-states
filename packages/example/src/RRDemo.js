import React from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Route,
  useLoaderData,
} from "react-router-dom";
import { API_JPH } from "./past/v2/shared/utils";
import {
  createLoaderProducer, useSource
} from "react-async-states";

async function loader({signal}) {
  return await API_JPH.get("/users", {signal});
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <MyApp/>,
    loader: createLoaderProducer(loader, "users-list"),
  },
]);

function MyApp() {
  const result = useLoaderData();
  console.log('useLoaderData', result);

  const watchedResult = useSource(result.source);
  console.log('useSourceResult', watchedResult);

  const {state} = watchedResult;
  return <button onClick={() => result.replay()}>replay
    - {state.status}</button>
}


export default function RRDemo() {
  return (
    <RouterProvider router={router}/>
  );
}
