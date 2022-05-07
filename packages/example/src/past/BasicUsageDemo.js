import React from "react";
import { demoAsyncStates } from "./Provider";
import { useAsyncState, useSelector } from "react-async-states";

function SimpleSub({
                     source,
                     asyncStateKey,
                     displayValue,
                     lazy = false,
                     suspend = false,
                     cacheConfig = null
                   }) {
  // console.log('inside simple sub', asyncStateKey, source);
  const {
    key,
    invalidateCache,
    state,
    read,
    run,
    abort,
    mode
  } = useAsyncState({source, key: asyncStateKey, lazy, cacheConfig});

    if (!key) {
      return "waiting...";
  }
  // console.log('later,', {key, state, mode})
  const {status, data} = state;
  // console.log('source ' + source.key, source.getState(), source.isSource, source);

  // console.log('suspend', suspend, read());
  const readData = suspend ? read().data : data;
  return (
    <div>
      <span>Key: {key}</span>
      <br/>
      <span>Status: {status}</span>
      <br/>
      <span>Run: <button onClick={() => run()}>Run {key}</button></span>
      <br/>
      <span>Run: <button
        onClick={() => invalidateCache()}>Invalidate cache</button></span>
      <br/>
      <span>Abort: <button onClick={() => abort()}
                           disabled={status !== "pending"}>Abort {key}</button></span>
      <br/>
      {status === "success" && (
        <div>
          <span>Data: </span>
          <br/>
          <ul>
            {displayValue(readData)}
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
        <section>
          <UndefinedProducerDemo/>
        </section>
        <section>
          <h3>Subscribe to global async state - {demoAsyncStates.users.key}</h3>
          <div style={{display: "flex"}}>
            <React.Suspense fallback="pending...users">
              <SimpleSub
                suspend
                source={demoAsyncStates.users}
                displayValue={data => data.map(user => <li
                  key={user.id}>{user.id} - {user.username} - {user.name} - {user.email}</li>)}
              />
            </React.Suspense>
            <hr/>
            <React.Suspense fallback="pending...posts">
              <SimpleSub
                lazy
                asyncStateKey={demoAsyncStates.posts.key}
                displayValue={data => data.map(post => <li
                  key={post.id}>{post.id} -
                  userId: {post.userId} - {post.title}</li>)}
              />
            </React.Suspense>
            <br/>
          </div>
        </section>
      </div>
    </div>
  );
}

function UndefinedProducerDemo() {

  return (
    <>
      <UndefinedProducerDemoHoister/>
      <UndefinedProducerDemoConsumer/>
      <UndefinedProducerDemoSelector/>
    </>
  );
}

function UndefinedProducerDemoHoister() {
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

function UndefinedProducerDemoConsumer() {
  const {state: {data}, run} = useAsyncState("user_input");
  return (
    <input style={{backgroundColor: "gray", border: "2px solid red"}}
           onChange={e => run(e.target.value)}
           value={data} placeholder="type something"/>
  );
}

function selectCurrentValue(state) {
  return state?.data;
}

function UndefinedProducerDemoSelector() {
  const data = useSelector("user_input", selectCurrentValue);
  return (

    <div>
      <h3>I select data from user input: {data}</h3>
    </div>
  );
}
