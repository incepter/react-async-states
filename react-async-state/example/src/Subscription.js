import React from "react";
import { isEqual } from "lodash";
import { useAsyncState, useAsyncStateSelector } from 'react-async-state';
import DemoProvider from "./Provider";


function timeout(delay, ...resolveValues) {
  return new Promise(resolve => setTimeout(() => resolve(...resolveValues), delay));
}

function curriedTimeout(delay) {
  return function curryImpl(...args) {
    return timeout(delay, ...args);
  }
}

function fake() {
  const {state: {data: currentUser}, run: reload} = useAsyncState("current-user", []);


  const {state, run, abort} = useAsyncState("users", []);

  // const {key, state, run, abort, previousState, replaceState} = useAsyncState({
  //   key: "posts",
  //   rerenderStatus: {loading: false, success: true, aborted: true, error: true},
  //   fork: true, // false
  //   forkConfig: {},
  //   hoistToProvider: true, // false
  //   promiseConfig: {
  //     config: {lazy: false}, promise() {
  //       return new Promise(function promiseImpl(resolve) {
  //         setTimeout(resolve, 1000); // resolve with undefined after one second
  //       })
  //     }
  //   }
  // }, []);


}

export function Subscription({asyncStateConfig}) {

  const {state, run, abort} = useAsyncState(asyncStateConfig, []);


  return (
    <span style={{maxWidth: 400}}>
      <button onClick={() => run()}>RUN</button><br/>
      {state.status === "loading" && <button onClick={() => abort("bghit")}>ABORT</button>}
      <pre>
        {state.status}
      </pre>
      {asyncStateConfig?.fork && "THIS IS A FORK"}
    </span>
  );
}

function usersSelector(usersState, postsState) {
  if (!usersState || !postsState || usersState.status === "loading" || postsState.status === "loading") {
    return undefined;
  }
  let user = usersState?.data?.find?.(t => t.id = 1);
  let posts = postsState?.data?.find?.(t => t.userId = 1);
  if (user && posts) {
    return {...user, posts}
  }
  return undefined;
}

function SelectorDemo() {
  const currentUserProfilePicture = useAsyncStateSelector("currentUser", getProfilePicture, isEqual, avatarUrl);
  const currentUserCategoriesDetails = useAsyncStateSelector(["currentUser", "categories"], getUserCategories);

  const selectedValue = useAsyncStateSelector(["users", "posts"], usersSelector, isEqual);

  console.log('SELECTED RENDER', selectedValue);

  return <div>SELECTOR VALUE: <pre>{JSON.stringify(selectedValue ?? {}, null, "  ")}</pre></div>
}

export default function Wrapper() {
  return (
    <DemoProvider>
      <div style={{display: "flex", justifyContent: "space-between"}}>
        <Subscription asyncStateConfig="users"/>
        <Subscription asyncStateConfig="posts"/>
        {/*<Subscription asyncStateConfig={{*/}
        {/*  key: "users",*/}
        {/*  fork: true,*/}
        {/*  hoistToProvider: true,*/}
        {/*  payload: {*/}
        {/*    userId: 1,*/}
        {/*  },*/}
        {/*}}/>*/}
      </div>
      <div><SelectorDemo/></div>
    </DemoProvider>
  );
}
