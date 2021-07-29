import React from "react";
import { demoAsyncStates } from "./Provider";
import { useAsyncState } from "react-async-state";

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
      <span>status: {status}</span>
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
          </div>
        </p>
      </div>
    </div>
  );
}
