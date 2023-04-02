import * as React from "react";
import {app} from "../app";
import {API} from "../api";
import {bindAbort} from "../../utils";
import {Link, Outlet, useLocation} from "react-router-dom";

app.posts.search.inject(async (props) => {
    let signal = bindAbort(props);
    return (await API.get(`posts${props.args[0]}`, {signal})).data
  }
)

export function Component() {
  let search = useLocation().search
  let posts = app.posts.search.use({autoRunArgs: [search + '']}, [search])
  return (
    <details open>
      <summary>Posts List</summary>
      <div style={{display: "flex", flexDirection: "column"}}>
        <div style={{display: "flex", flexDirection: "column"}}>
          {posts.map(post => <Link key={post.id}
                                   to={`${post.id}`}>{post.title}</Link>)}
        </div>
        <hr/>
        <Outlet/>
      </div>
    </details>
  );
}
