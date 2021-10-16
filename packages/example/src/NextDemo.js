import React from "react";
import {useAsyncState, createSourceAsyncState} from "react-async-states";

function* fetchUser(id) {
  return yield fetch(`https://jsonplaceholder.typicode.com/users/${id}`).then(s => s.json());
}

const user1Source = createSourceAsyncState("user1", () => fetchUser(1));
const user2Source = createSourceAsyncState("user2", () => fetchUser(2));
const userPayloadSource = createSourceAsyncState("userPayload", argv => fetchUser(argv.payload.userId));

const name = s => s.data?.name;

export default function NextDemo() {
  const {state: user1} = useAsyncState.selector(s => s.data).auto(user1Source);

  const {state: user2} = useAsyncState.selector(name).auto(user2Source);

  const {state: user3} = useAsyncState.payload({userId: 3}).selector(name).hoistAuto(userPayloadSource)

  const {state: user4} = useAsyncState.selector(name).payload({userId: 4}).forkAuto(userPayloadSource)

  return <div style={{display: "flex"}}>
    <pre>user1: {JSON.stringify(user1, null, 4)}</pre>
    <pre>user2: {JSON.stringify(user2, null, 4)}</pre>
    <pre>user3: {JSON.stringify(user3, null, 4)}</pre>
    <pre>user4: {JSON.stringify(user4, null, 4)}</pre>
  </div>;
}
