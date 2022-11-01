import React from 'react'
import ReactDOM from 'react-dom/client'

import './index.css'
import {
  createSource,
  runpSource,
  useSelector,
  AsyncStateStatus,
  AsyncStateProvider, useAsyncState
} from "react-async-states";
import App from "./past/App"

//
function fetchProfiles(props) {

  const controller = new AbortController();

  props.onAbort(() => {
    controller.abort()
  });

  return fetch(
    `https://jsonplaceholder.typicode.com/users/${props.args[0] ?? ''}`,
    {signal: controller.signal}
  ).then(r => r.json());

}
//
const profilesList = createSource("profiles", fetchProfiles, {
  // runEffect: "delay",
  // runEffectDurationMs: 800
});
const root = ReactDOM.createRoot(document.getElementById("root"));

// runpSource(profilesList)
//   .then(() => {
//     root.render(
//       <React.StrictMode>
//         <AsyncStateProvider>
//           <ProviderTest/>
//           <ProfilesView/>
//         </AsyncStateProvider>
//       </React.StrictMode>
//     )
//   });

root.render(
  <React.StrictMode>
    <AsyncStateProvider>
      <Wrapper initialValue={true}>
        <ProfilesView/>
      </Wrapper>
    </AsyncStateProvider>
  </React.StrictMode>
)

//
function ProfilesView() {
  const {state} = useAsyncState.auto({source: profilesList, autoRunArgs: [2]});

  if (state.status !== AsyncStateStatus.error && state.status !== AsyncStateStatus.success) {
    return "Pending..."
  }

  if (state.status === AsyncStateStatus.error) {
    return <span>Error occurred!!! {state.data?.toString?.()}</span>
  }
  const data = Array.isArray(state.data) ? state.data : [state.data]
  return (
    <div className="splash" style={{
      display: "flex",
      paddingBottom: 20,
    }}>
      {data.map((profile, index) => <ProfileView key={profile.username}
                                                       profile={profile}
                                                       index={index}/>)}
    </div>
  );
}

function ProfileView({profile, index}) {
  return (<div className="card" title={profile.username} style={{
    opacity: 0,
    width: 100,
    height: 100,
    marginTop: 20,
    marginLeft: 20,
    display: "flex",
    textAlign: "center",
    alignItems: "center",
    justifyContent: "center",
    animation: "fadeIn 800ms 1",
    animationFillMode: 'forwards',
    animationDelay: `${index * 50}ms`,
  }}>{profile.name}</div>)
}

// function ProviderTest() {
//   return (
//     <Wrapper>
//       <Hoister/>
//     </Wrapper>
//   );
// }

function Wrapper({children, initialValue = false}) {
  const [mounted, setMounted] = React.useState(initialValue);

  return (
    <>
      <button
        onClick={() => setMounted(old => !old)}>
        {mounted ? "unmount" : "mount"}
      </button>
      {mounted && children}
    </>
  );
}
//
// function Hoister() {
//   const {state} = useAsyncState.hoist({
//     key: "haha",
//     initialValue: 5,
//     producer: () => 3,
//     resetStateOnDispose: true,
//   });
//
//   return state.data;
// }
