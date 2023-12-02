import {useParams} from "react-router-dom";
import {app} from "../../../app";
import {API} from "../../../api";

app.users.findUserPosts.inject(
  async (props) => {
    let signal = props.signal;
    return (await API.get(`users/${props.args[0]}/posts`, {signal})).data
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
  let userPosts = app.users.findUserPosts.use({
    lazy: false,
    autoRunArgs: [userId!]
  }, [userId])
  let currentUser = app.users.findById.use()

  return (
    <details open>
      <summary>User {currentUser.username} posts</summary>
      <pre>{JSON.stringify(userPosts, null, 4)}</pre>
    </details>
  );
}
