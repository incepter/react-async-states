import React from "react";
import { useHistory, useParams } from "react-router-dom";
import { useAsyncState } from "react-async-states";
import { demoAsyncStates } from "./Provider";
import { API_JPH, bindAbortAndCancelToken } from "./v2/shared/utils";

export default function Demo() {
  const ref = React.useRef();
  const history = useHistory();
  const params = useParams();

  const {mode, state: {status, data}, lastSuccess, abort, source} = useAsyncState({
    lazy: false,
    payload: {matchParams: params},
    key: demoAsyncStates.getUser.key,
    // this function does not depend on render and may be static
    producer(props) {
      const cancelToken = bindAbortAndCancelToken(props);
      const {userId} = props.payload.matchParams;
      return API_JPH.get(`/users/${userId}`, {cancelToken})
        .then(response => {
          const matches = response.headers['cache-control'].match(/max-age=(\d+)/)
          const maxAge = matches ? parseInt(matches[1], 10) : -1

          return ({
            ...response.data,
            maxAge,
          });
        });
    },
    // this function does not depend on render and may be static
    postSubscribe({getState, run}) {
      const state = getState();
      if (!state || state.status === "pending") {
        return;
      }
      const onFocus = () => run();
      window.addEventListener("focus", onFocus);
      return () => window.removeEventListener("focus", onFocus);
    },
    selector(current, lastSuccess, cache) {
      if (cache[`user-${params.userId}`]) {
        return cache[`user-${params.userId}`].state;
      }
      return current;
    },
    // this object does not depend on render and may be static
    cacheConfig: {
      enabled: true,
      getDeadline: state => state.data?.maxAge || 5000,
      load: () => JSON.parse(localStorage.getItem("users-cache-demo")),
      hash: (args, payload) => `user-${payload?.matchParams?.userId}`,
      persist: cache => localStorage.setItem("users-cache-demo", JSON.stringify(cache))
    }
  }, [params]);

  const meter = React.useRef(0);
  meter.current += 1;
  console.log('render!!', {status, meter: meter.current, uniqueId: source.uniqueId})

  function navigate(e) {
    e.preventDefault();
    history.push(`/users/${ref.current.value}`)
  }

  return (
    <div>
      <form onSubmit={navigate}>
        <input defaultValue={params.userId} ref={ref}
               style={{backgroundColor: "red"}} placeholder="user id"/>
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
  const data = useAsyncState({
    lazy: false,
    source,
    subscriptionKey: `SourceForkExample-${source?.key}-SELF`,
    payload: {userId: id},
    fork: true,
    forkConfig: {key: `SourceForkExample-${source?.key}`}
  });
  return <button onClick={() => {
    data.mergePayload({userId: (data.payload.userId || 0) + 1});
    data.run();
  }}>RUUUUUUUN{JSON.stringify(data.state.status)}-{JSON.stringify(data.lastSuccess.data)?.substring(0, 30)}</button>;
}
