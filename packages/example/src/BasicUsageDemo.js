import React from "react";
import { demoAsyncStates } from "./Provider";
import { useAsyncState, useAsyncStateSelector } from "react-async-states";

function SimpleSub({asyncStateKey, displayValue}) {
  const {key, state: {status, data}, run, abort, source} = useAsyncState(asyncStateKey);
  // console.log('source ' + source.key, source.getState(), source.isSource, source);

  return (
    <div>
      <span>Key: {key}</span>
      <br/>
      <span>Status: {status}</span>
      <br/>
      <span>Run: <button onClick={() => run()}>Run {key}</button></span>
      <br/>
      <span>Abort: <button onClick={() => abort()} disabled={status !== "pending"}>Abort {key}</button></span>
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
      <SourceExample source={source}/>
    </div>
  );
}

function SourceExample({source}) {
  console.log(useAsyncState({lazy: false, source: window.__AM_LAZY__, payload: {userId: 1}, selector: d => d.status}).state);
  return null;
}

export default function Demo() {
  return (
    <div>
      <div>
        <section>
          <UndefinedPromiseDemo/>
        </section>
        <section>
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
        </section>
      </div>
    </div>
  );
}

function UndefinedPromiseDemo() {

  return (
    <>
      <UndefinedPromiseDemoHoister/>
      <UndefinedPromiseDemoConsumer/>
      <UndefinedPromiseDemoSelector/>
    </>
  );
}

function UndefinedPromiseDemoHoister() {
  const {state} = useAsyncState({
    lazy: true,
    key: "user_input",
    selector: s => s.data,
    hoistToProvider: true,
    initialValue: "Type something",
  });

  return (
    <div>
      <h3>user input value: {state}</h3>
    </div>
  );
}

function UndefinedPromiseDemoConsumer() {
  const {state: {data}, run} = useAsyncState("user_input");
  return (
    <input style={{backgroundColor: "gray", border: "2px solid red"}} onChange={e => run(e.target.value)}
           value={data} placeholder="type something"/>
  );
}

function selectCurrentValue(state) {
  return state?.data;
}

function UndefinedPromiseDemoSelector() {
  const data = useAsyncStateSelector("user_input", selectCurrentValue);
  return (

    <div>
      <h3>I select data from user input: {data}</h3>
    </div>
  );
}
