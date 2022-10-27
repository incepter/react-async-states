import React from 'react'
import ReactDOM from 'react-dom/client'

import './index.css'
import {
  runpSource,
  createSource,
  RenderStrategy,
  StateBoundary,
  useSource
} from "react-async-states";


function fetchProfiles(props) {

  const controller = new AbortController();
  props.onAbort(() => {
    controller.abort()
  });
  return fetch(`https://jsonplaceholder.typicode.com/users`, {signal: controller.signal}).then(r => r.json());

}

const profilesList = createSource("profiles", fetchProfiles, {runEffect: "delay", runEffectDurationMs: 800});
const root = ReactDOM.createRoot(document.getElementById("root"));

runpSource(profilesList)
  .then(state =>  {
    root.render(
      <React.StrictMode>
        <StateBoundary strategy={RenderStrategy.FetchThenRender} config={profilesList}>
          <ProfilesView />
        </StateBoundary>
      </React.StrictMode>
    )
  });


function ProfilesView() {
  const {state} = useSource(profilesList);
  console.log('rendeerrrrr', state)
  return <details open>
    <summary>App boot with state of status {state.status}</summary>
    <pre>{JSON.stringify(state.data, null, 4)}</pre>
  </details>
}
