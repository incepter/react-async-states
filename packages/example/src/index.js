import React from 'react'
import ReactDOM from 'react-dom/client'

import './index.css'
import { createSource, runpSource, useSelector } from "react-async-states";


function fetchProfiles(props) {

  const controller = new AbortController();
  props.onAbort(() => {
    controller.abort()
  });
  return fetch(`https://jsonplaceholder.typicode.com/users`, {signal: controller.signal}).then(r => r.json());

}

const profilesList = createSource("profiles", fetchProfiles, {
  runEffect: "delay",
  runEffectDurationMs: 800
});
const root = ReactDOM.createRoot(document.getElementById("root"));

runpSource(profilesList)
  .then(() => {
    root.render(
      <React.StrictMode>
        <ProfilesView/>
      </React.StrictMode>
    )
  });


function ProfilesView() {
  const state = useSelector(profilesList);
  return <details open>
    <summary>App boot with state of status {state.status}</summary>
    <pre>{JSON.stringify(state.data, null, 4)}</pre>
  </details>
}
