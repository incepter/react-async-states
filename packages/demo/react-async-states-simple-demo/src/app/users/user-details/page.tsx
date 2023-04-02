import {app} from "../../app";
import {bindAbort} from "../../../utils";
import {API} from "../../api";
import {Link, Outlet, useParams} from "react-router-dom";

app.users.findById.inject(
  async (props) => {
    let signal = bindAbort(props);
    return (await API.get(`users/${props.args[0]}`, {signal})).data
  },
  {
    keepPendingForMs: 300,
    skipPendingDelayMs: 300,
    resetStateOnDispose: true,
    cacheConfig: {
      enabled: true,
      hash: (args?) => args?.[0] ?? "a bug"
    }
  }
)

export function Component() {
  let {userId} = useParams()
  let user = app.users.findById.use({
    lazy: false,
    autoRunArgs: [userId!]
  }, [userId])

  return (
    <div>
      <details>
        <summary>User {user.username} details</summary>
        <pre>{JSON.stringify(user, null, 4)}</pre>
      </details>
      <Link to="posts">see posts</Link>
      <hr />
      <Outlet />
    </div>
  );
}
