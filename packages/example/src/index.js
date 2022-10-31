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

//
// function fetchProfiles(props) {
//
//   const controller = new AbortController();
//   props.onAbort(() => {
//     controller.abort()
//   });
//   return fetch(`https://jsonplaceholder.typicode.com/users`, {signal: controller.signal}).then(r => r.json());
//
// }
//
// const profilesList = createSource("profiles", fetchProfiles, {
//   // runEffect: "delay",
//   // runEffectDurationMs: 800
// });
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
      <ProviderTest/>
    </AsyncStateProvider>
  </React.StrictMode>
)

//
// function ProfilesView() {
//   const state = useSelector(profilesList);
//   if (state.status !== AsyncStateStatus.error && state.status !== AsyncStateStatus.success) {
//     return "state is still not resolved!"
//   }
//
//   if (state.status === AsyncStateStatus.error) {
//     return <span>Error occurred!!! {state.data?.toString?.()}</span>
//   }
//   return (
//     <div className="splash" style={{
//       display: "flex",
//       paddingBottom: 20,
//     }}>
//       {state.data.map((profile, index) => <ProfileView key={profile.username}
//                                                        profile={profile}
//                                                        index={index}/>)}
//     </div>
//   );
// }

// function ProfileView({profile, index}) {
//   return (<div className="card" title={profile.username} style={{
//     opacity: 0,
//     width: 100,
//     height: 100,
//     marginTop: 20,
//     marginLeft: 20,
//     display: "flex",
//     textAlign: "center",
//     alignItems: "center",
//     justifyContent: "center",
//     animation: "fadeIn 800ms 1",
//     animationFillMode: 'forwards',
//     animationDelay: `${index * 50}ms`,
//   }}>{profile.name}</div>)
// }

function ProviderTest() {
  const [mounted, setMounted] = React.useState(false);

  return (
    <>
      <button
        onClick={() => setMounted(old => !old)}>
        {mounted ? "unmount" : "mount"}
      </button>
      {mounted && <Hoister/>}
    </>
  );
}

function Hoister() {
  const {state} = useAsyncState.hoist({
    key: "haha",
    initialValue: 5,
    producer: () => 3,
    resetStateOnDispose: true,
  });

  return state.data;
}
