import React from "react";
import { useHistory, useLocation, useParams } from "react-router-dom";
import { useAsyncState } from "react-async-states";
import { DOMAIN_USER_PRODUCERS } from "./producers";
import { parseSearch, readFormValues } from "../../shared/utils";

export default function UsersPage() {
  const history = useHistory();
  const search = useLocation().search;
  const queryString = parseSearch(search);
  const {state: {status, data}, run, abort} = useAsyncState.auto(DOMAIN_USER_PRODUCERS.list.key, [search]);

  function onSubmit(e) {
    e.preventDefault();

    const values = readFormValues(e.target);
    history.push("?" + Object.entries(values)
      .map(([key, value]) => `${key}=${value}`)
      .join("&")
    );
  }

  return (
    <div>
      <div>
        <form onSubmit={onSubmit}>
          <input defaultValue={queryString.id} name="id" placeholder="user-id"/>
          <input name="name" defaultValue={queryString.name} placeholder="user-name"/>
          <input name="email" defaultValue={queryString.email} placeholder="user-email"/>
          <button type="submit">search</button>
        </form>
      </div>
      <h3>Users List</h3>{status === "pending" && <span>...<button onClick={() => abort()}>Abort</button></span>}
      {status !== "pending" && <button onClick={() => run()}>Reload</button>}
      {status === "success" && (
        <div>
          {!data.length && "No results!"}
          <ul>
            {data.map(user => <li key={user.id}>{user.id}-{user.name}-{user.email}</li>)}
          </ul>
        </div>
      )}
      {status === "error" && <div>
        <button onClick={() => run()}>Retry</button>
      </div>}
    </div>
  );
}

export function UserDetailsPage() {
  return (
    <div style={{display: "flex"}}>
      <UserDetailsPageImpl/>
      <UserDetailsPageImpl2/>
    </div>
  );
}

function UserDetailsPageImpl({fork = false}) {

  const history = useHistory();
  const matchParams = useParams();

  const {state, abort, run} = useAsyncState.auto({
    source: DOMAIN_USER_PRODUCERS.details,
    payload: {
      userId: matchParams.userId
    }
  }, [matchParams.userId]);

  function onSubmit(e) {
    e.preventDefault();

    const values = readFormValues(e.target);
    history.push(`/users/${values.id}`);
  }

  return (
    <div>
      <div>
        <form onSubmit={onSubmit}>
          <input defaultValue={matchParams.userId} name="id" placeholder="user-id"/>
          <button type="submit">search</button>
        </form>
      </div>
      <h3>Users details</h3>{state?.status === "pending" && <span>...<button
      onClick={() => abort()}>Abort</button></span>}
      {state?.status !== "pending" && <button onClick={() => run()}>Reload</button>}
      {state?.status === "success" && (
        <div>
          {!state.data && "No results!"}
          <pre>
            {JSON.stringify(state.data, null, "  ")}
          </pre>
        </div>
      )}
      {state?.status === "error" && (<div>
        <button onClick={() => run()}>Retry</button>
        <pre>
            {JSON.stringify(state?.data, null, "  ")}
          </pre>
      </div>)}
    </div>
  );
}

function UserDetailsPageImpl2() {
  const {state: {status, data}, abort, run, mergePayload} = useAsyncState.fork(DOMAIN_USER_PRODUCERS.details);

  function onSubmit(e) {
    e.preventDefault();

    const {id: userId} = readFormValues(e.target);
    mergePayload({userId})
    run();
  }

  return (
    <div>
      <div>
        <form onSubmit={onSubmit}>
          <input defaultValue={""} name="id" placeholder="user-id"/>
          <button type="submit">search</button>
        </form>
      </div>
      <h3>Users details</h3>{status === "pending" && <span>...<button onClick={() => abort()}>Abort</button></span>}
      {status !== "pending" && <button onClick={() => run()}>Reload</button>}
      {status === "success" && (
        <div>
          {!data && "No results!"}
          <pre>
            {JSON.stringify(data, null, "  ")}
          </pre>
        </div>
      )}
      {status === "error" && (<div>
        <button onClick={() => run()}>Retry</button>
        <pre>
            Error: {typeof data === "string" ? data : JSON.stringify(data, null, 4)}
          </pre>
      </div>)}
    </div>
  );
}

// string, object(), source, object(source), producer function (generator, async await, function returnning anything, sync or astync)

// const {
//   key,
//   source,
//
//   state, // selector return
//   run,
//   lastSuccess,
//   payload,
//
//   abort,
//   replaceState,
//   mergePayload,
//
//   runAsyncState,
// } = useAsyncState({
//   source: null,
//   key: "my-key",
//   initialValue: 0, // value or function
//
//   payload: {},
//   hoistToProvider: true,
//   hoistToProviderConfig: {override: false},
//   fork: true,
//   forkConfig: {keepState: true, key: "new-key"},
//
//   selector: (s, lastSu) => [],
//   areEqual: (prev, next) => true,
//
//   producer (props) {}
// }, []);
//
// const props = {
//   payload, // combined, __provider__.select/run, principal, queryString, pathname, onSuccess
//
//   aborted: false,
//   onAbort: cb => cb,
//   abort() {},
//
//   args: [],
//   lastSuccess: {status, data, props},
// }
