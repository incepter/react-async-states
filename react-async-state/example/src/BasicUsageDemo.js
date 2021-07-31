import React from "react";
import { demoAsyncStates } from "./Provider";
import { useAsyncState, useAsyncStateSelector } from "react-async-state";

function SimpleSub({asyncStateKey, displayValue}) {
  const {key, state: {status, data}, run, abort} = useAsyncState(asyncStateKey);

  return (
    <div>
      <span>Key: {key}</span>
      <br/>
      <span>Status: {status}</span>
      <br/>
      <span>Run: <button onClick={() => run()}>Run {key}</button></span>
      <br/>
      <span>Abort: <button onClick={() => abort()} disabled={status !== "loading"}>Abort {key}</button></span>
      <br/>
      {status === "success" && (
        <div>
          <span>Data: </span>
          <br/>
          <ul>
            {displayValue(data)}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function Demo() {
  return (
    <div>
      <div>
        <p>
          <UndefinedPromiseDemo/>
        </p>
        <p>
          <h3>Subscribe to global async state - {demoAsyncStates.users.key}</h3>
          <div style={{display: "flex"}}>
            <SimpleSub
              asyncStateKey={demoAsyncStates.users.key}
              displayValue={data => data.map(user => <li
                key={user.id}>{user.id} - {user.username} - {user.name} - {user.email}</li>)}
            />
            <hr/>
            <SimpleSub
              asyncStateKey={demoAsyncStates.posts.key}
              displayValue={data => data.map(post => <li key={post.id}>{post.id} -
                userId: {post.userId} - {post.title}</li>)}
            />
            <br/>
          </div>
        </p>
      </div>
    </div>
  );
}

function UndefinedPromiseDemo() {

  return (
    <>
      <UndefinedPromiseDemo_Hoister/>
      <UndefinedPromiseDemo_Consumer/>
      <UndefinedPromiseDemo_Selector/>
    </>
  );
}

function UndefinedPromiseDemo_Hoister() {
  const {state: {data}} = useAsyncState({key: "user_input", hoistToProvider: true});

  return (
    <div>
      <h3>user input value: {data}</h3>
    </div>
  );
}

function UndefinedPromiseDemo_Consumer() {
  const {state: {data}, replaceState} = useAsyncState("user_input");
  return (
    <input style={{backgroundColor: "gray", border: "2px solid red"}} onChange={e => replaceState(e.target.value)}
           value={data} placeholder="type something"/>
  );
}

function selectCurrentValue(state) {
  return state?.data;
}

function UndefinedPromiseDemo_Selector() {
  const data = useAsyncStateSelector("user_input", selectCurrentValue);
  return (

    <div>
      <h3>I select data from user input: {data}</h3>
    </div>
  );
}
