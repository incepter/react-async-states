import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAsyncState } from "react-async-states";
import { demoAsyncStates } from "./Provider";

export default function Demo() {
  const ref = React.useRef();
  const navigate = useNavigate();
  const params = useParams();

  const {
    mode,
    uniqueId,
    state: {status, data},
    abort
  } = useAsyncState({
    fork: true,
    subscriptionKey: "hahaha",
    lazy: false,
    payload: {matchParams: params},
    key: demoAsyncStates.getUser.key,
    // this function does not depend on render and may be static
    selector(current, lastSuccess, cache) {
      if (cache[`user-${params.userId}`]) {
        return cache[`user-${params.userId}`].state;
      }
      return current;
    },
    // this object does not depend on render and may be static
    cacheConfig: {
      enabled: false,
      getDeadline: state => state.data?.maxAge || 5000,
      load: () => JSON.parse(localStorage.getItem("users-cache-demo")),
      hash: (args, payload) => `user-${payload?.matchParams?.userId}`,
      persist: cache => localStorage.setItem("users-cache-demo", JSON.stringify(cache))
    },
    // this function does not depend on render and may be static
    events: {
      // subscribe({getState, run}) {
      //   const state = getState();
      //   if (!state || state.status === "pending") {
      //     return;
      //   }
      //   const onFocus = () => run();
      //   window.addEventListener("focus", onFocus);
      //   return () => window.removeEventListener("focus", onFocus);
      // },
      change({state}) {
        console.log("state changed!____________", state)
      }
    }
  }, [params]);

  console.log('render', mode, uniqueId)

  function onSubmit(e) {
    e.preventDefault();
    navigate(`/users/${ref.current.value}`)
  }

  return (
    <div>
      <form onSubmit={onSubmit}>
        <input defaultValue={params.userId} ref={ref}
               style={{backgroundColor: "red"}} placeholder="user id"/>
      </form>
      <>
        {status === "pending" && (
          <>
            <button onClick={() => abort()}>Abort</button>
            <span>Loading...</span>
          </>
        )}
      </>

      <span>
        <pre>
          <details open>
            {JSON.stringify(data, null, "  ")}
          </details>
        </pre>
      </span>
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
