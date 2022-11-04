import React from "react";
import { isEqual } from "lodash";
import { useAsyncState, useSelector, AsyncStateProvider } from 'react-async-states';
import { asyncStatesDemo } from "./Provider";


function timeout(delay, ...resolveValues) {
  return new Promise(resolve => setTimeout(() => resolve(...resolveValues), delay));
}

function curriedTimeout(delay) {
  return function curryImpl(...args) {
    return timeout(delay, ...args);
  }
}

export function Subscription({asyncStateConfig}) {

  const {state, run, abort} = useAsyncState(asyncStateConfig, []);

  return (
    <span style={{maxWidth: 400}}>
      <button onClick={() => run()}>RUN</button><br/>
      {state.status === "pending" &&
        <button onClick={() => abort("bghit")}>ABORT</button>}
      <pre>
        {state.status}
      </pre>
      {asyncStateConfig?.fork && "THIS IS A FORK"}
    </span>
  );
}

function usersSelector(usersState, postsState) {
  if (!usersState || !postsState || usersState.status === "pending" || postsState.status === "pending") {
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
  const selectedValue = useSelector(["users", "posts"], usersSelector, isEqual);

  return <div>SELECTOR
    VALUE: <pre>{JSON.stringify(selectedValue ?? {}, null, "  ")}</pre></div>
}

export default function Wrapper() {
  return (
    <AsyncStateProvider initialStates={asyncStatesDemo}>
      {/*<div style={{display: "flex", justifyContent: "space-between"}}>*/}
        {/*<Subscription asyncStateConfig="users"/>*/}
        {/*<Subscription asyncStateConfig="posts"/>*/}
        {/*<Subscription asyncStateConfig={{*/}
        {/*  key: "users",*/}
        {/*  fork: true,*/}
        {/*  hoistToProvider: true,*/}
        {/*  payload: {*/}
        {/*    userId: 1,*/}
        {/*  },*/}
        {/*}}/>*/}
      {/*</div>*/}
      {/*<div style={{backgroundColor: "gray"}}><SelectorDemo/></div>*/}
      <ReplaceStateOriginal/>
      {/*<ReducerDemo/>*/}
    </AsyncStateProvider>

  );
}


const undefinedProducer = {
  initialValue: "",
  hoistToProvider: true,
  key: "undefined_producer",
};

function ReplaceStateOriginal() {
  const {
    key,
    version,
    state: {data},
    replaceState
  } = useAsyncState(undefinedProducer, []);

  return (
    <>
      <h3>{version}-{data}</h3>
      <input
        style={{
          minWidth: 200,
          backgroundColor: "red",
          color: "white",
          border: "5px solid red"
        }} value={data ?? ""}
        onChange={e => replaceState(e.target.value)}/>
    </>
  );
}

function ReplaceStateListener() {
  const {state: {status, data}} = useAsyncState(undefinedProducer.key, []);

  return (
    <>
      <h3>{status}-{data}</h3>
    </>
  );
}


const reducerProducer = {
  key: "reducer_producer",
  hoistToProvider: false,
  producer(props) {
    const {args: [userInput]} = props;
    if (userInput > 10) {
      return "OK good!";
    }
    return "KO !!"
  },
  lazy: false
};

function ReducerDemo() {
  const inputRef = React.useRef();
  const {state: {status, data}, run} = useAsyncState(reducerProducer, []);

  return (
    <div>
      <span>{status}-{data}</span>
      <input placeholder="type here" ref={inputRef}/>
      <button onClick={() => {
        run(Number(inputRef.current.value));
      }}>ClickME!
      </button>
    </div>
  );
}
