import * as React from "react";
import {useAsyncState, UseAsyncState, AsyncStateStatus, State, useSource} from "react-async-states";
import {currentUserConfig, principalSource} from "./producers";
import {UserType} from "../../domains/users/User";

export default function ProfileView() {
  const {state}: UseAsyncState<UserType> = useAsyncState(principalSource);

  return (
    <details open>
      <ul>
        <li>status: {state.status}</li>
        <li>profile ID: {useSource(currentUserConfig).state.data.id}</li>
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
    return JSON.stringify(state.data, null, 4);
  }
  if (state.status === AsyncStateStatus.error) {
    return state.data?.toString?.();
  }
  return null;
}
