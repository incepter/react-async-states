import * as React from "react";
import {useAsyncState, UseAsyncState} from "react-async-states";
import {principalSource} from "./producers";
import {UserType} from "../../domains/users/User";

export default function ProfileView() {
  const {state}: UseAsyncState<UserType> = useAsyncState(principalSource);

  return <details open><pre>{JSON.stringify(state, null, 4)}</pre></details>
}
