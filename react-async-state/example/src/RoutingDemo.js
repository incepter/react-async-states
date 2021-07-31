import React from "react";
import { useHistory, useParams } from "react-router-dom";
import { useAsyncState } from "react-async-state";
import { demoAsyncStates } from "./Provider";

export default function Demo() {
  const ref = React.useRef();
  const history = useHistory();
  const params = useParams();

  const {state: {status, data}} = useAsyncState({
    key: demoAsyncStates.getUser.key,
    payload: {matchParams: params},
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
      {status === "loading" && <span>Loading...</span>}
      {status === "success" && (
        <span>
          <pre>
            <details>
              {JSON.stringify(data, null, "  ")}
            </details>
          </pre>
        </span>
      )}
    </div>
  );
}