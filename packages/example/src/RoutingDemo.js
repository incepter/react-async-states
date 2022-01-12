import React from "react";
import { useHistory, useParams } from "react-router-dom";
import { useAsyncState } from "react-async-states";
import { demoAsyncStates } from "./Provider";

export default function Demo() {
  const ref = React.useRef();
  const history = useHistory();
  const params = useParams();

  const {state: {status, data}, lastSuccess, abort} = useAsyncState({
    lazy: false,
    payload: {matchParams: params},
    key: demoAsyncStates.getUser.key,
  }, [params]);
  console.log('render', params, status, ++React.useRef(0).current)

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
      <SourceForkExample source={window.__AM_LAZY__}/>
      <br/>
      <SourceForkExample source={demoAsyncStates.users}/>
    </div>
  );
}

let id = 1;

function next() {
  return ++id;
}

function SourceForkExample({source}) {
  console.log('will use', {
    lazy: false,
    source,
    subscriptionKey: `SourceForkExample-${source.key}-SELF`,
    payload: {userId: id},
    fork: true,
    forkConfig: {key: `SourceForkExample-${source.key}`}
  })
  const data = useAsyncState({
    lazy: false,
    source,
    subscriptionKey: `SourceForkExample-${source.key}-SELF`,
    payload: {userId: id},
    fork: true,
    forkConfig: {key: `SourceForkExample-${source.key}`}
  });
  console.log('RENDERING,', data);
  return <button onClick={() => {
    data.mergePayload({userId: (data.payload.userId || 0) + 1});
    data.run();
  }}>RUUUUUUUN{JSON.stringify(data.state.status)}-{JSON.stringify(data.lastSuccess.data)?.substring(0, 30)}</button>;
}
