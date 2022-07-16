import * as React from "react";
import {useAsyncState, UseAsyncState, AsyncStateStatus, State} from "react-async-states";
import {principalSource} from "./producers";
import {UserType} from "../../domains/users/User";

export default function ProfileView() {
  const {state}: UseAsyncState<UserType> = useAsyncState(principalSource);

  return (
    <details open>
      <ul>
        <li>status: {state.status}</li>
        <li>profile ID: {JSON.stringify(state.props, null, 4)}</li>
        <li>
          data:
          <pre>
            {displayData(state)}
          </pre>
        </li>
        <li>date: {state.timestamp}</li>
      </ul>
    </details>
  )
}
function displayData(state: State<UserType>) {
  if (state.status === AsyncStateStatus.success) {
    return state.data;
  }
  if (state.status === AsyncStateStatus.error) {
    return state.data?.toString?.();
  }
  return null;
}
