import * as React from "react";
import {app} from "../app";
import {API} from "../api";
import {bindAbort} from "../../utils";
import {Link, Outlet, useLocation} from "react-router-dom";

app.users.search.inject(async (props) => {
    let signal = bindAbort(props);
    return (await API.get(`users${props.args[0]}`, {signal})).data
  }
)

export function Component() {
  let search = useLocation().search
  let users = app.users.search.use({autoRunArgs: [search + '']}, [search])
  return (
    <details open>
      <summary>Users List</summary>
      <div style={{display: "flex", flexDirection: "column"}}>
        <div style={{display: "flex", flexDirection: "column"}}>
          {users.map(user => <Link key={user.id}
                                   to={`${user.id}`}>{user.username}</Link>)}
        </div>
        <hr/>
        <Outlet/>
      </div>
    </details>
  );
}
