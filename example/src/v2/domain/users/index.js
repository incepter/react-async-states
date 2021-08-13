import React from "react";
import { useHistory, useLocation, useParams } from "react-router-dom";
import { useAsyncState } from "react-async-states";
import { DOMAIN_USER_PROMISES } from "./promises";
import { parseSearch, readFormValues } from "../../shared/utils";

export default function UsersPage() {
  const history = useHistory();
  const search = useLocation().search;
  const queryString = parseSearch(search);
  const {state: {status, data}, abort, run} = useAsyncState(DOMAIN_USER_PROMISES.list.key, [search]);

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
      <h3>Users List</h3>{status === "loading" && <span>...<button onClick={() => abort()}>Abort</button></span>}
      {status !== "loading" && <button onClick={() => run()}>Reload</button>}
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
  const history = useHistory();
  const matchParams = useParams();

  const {state: {status, data}, abort, run} = useAsyncState({
    key: DOMAIN_USER_PROMISES.details.key,
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
      <h3>Users details</h3>{status === "loading" && <span>...<button onClick={() => abort()}>Abort</button></span>}
      {status !== "loading" && <button onClick={() => run()}>Reload</button>}
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
            {JSON.stringify(data, null, "  ")}
          </pre>
      </div>)}
    </div>
  );
}
