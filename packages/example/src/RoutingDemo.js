import React from "react";
import { useHistory, useParams } from "react-router-dom";
import { useAsyncState } from "react-async-states";
import { demoAsyncStates } from "./Provider";

export default function Demo() {
  const ref = React.useRef();
  const history = useHistory();
  const params = useParams();

  const {state: {status, data}, lastSuccess, abort, source} = useAsyncState({
    key: demoAsyncStates.getUser.key,
    payload: {matchParams: params},
    rerenderStatus: {pending: true}
  }, [params]);

  function navigate(e) {
    e.preventDefault();
    history.push(`/users/${ref.current.value}`)
  }

  return (
    <div>
      <form onSubmit={navigate}>
        <input defaultValue={params.userId} ref={ref} style={{backgroundColor: "red"}} placeholder="user id"/>
      </form>
      {status === "pending" && (
        <>
          <button onClick={() => abort()}>Abort</button>
          <span>Loading...</span>
          <pre>
            {JSON.stringify(lastSuccess, null, "  ")}
          </pre>
        </>
      )}
      <span>
        <pre>
          <details>
            {JSON.stringify(data, null, "  ")}
          </details>
        </pre>
      </span>
      <SourceExample source={window.__AM_LAZY__}/>
      <br />
      <SourceExample source={demoAsyncStates.users}/>
    </div>
  );
}

let id = 1;
function next() {
  return ++id;
}
function SourceExample({source}) {
  const data = useAsyncState({lazy: false, source, payload: {userId: id}, fork: true});
  return <button onClick={() => {
    data.mergePayload({ userId: (data.payload.userId || 0) + 1 });
    data.run();
  }}>RUUUUUUUN{JSON.stringify(data.state.status)}-{JSON.stringify(data.lastSuccess.data)?.substring(0, 30)}</button>;
}
