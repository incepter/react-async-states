import React from "react";
import {useAsyncState} from "react-async-states";

export default function NextDemo() {
  const {key, state, mode} = useAsyncState.forkAuto(() => fetch("https://jsonplaceholder.typicode.com/users/1").then(s => s.json()));

  console.log('mode', mode);
  return <pre>{JSON.stringify({key, state, mode}, null, 4)}</pre>;
}
