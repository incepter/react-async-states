import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./css-v2.css";
import DevModeApp from "./DevModeApp";
import { __DEV__ } from "./utils";
import { autoConfigureDevtools, Devtools } from "./v2";

autoConfigureDevtools({ open: true });

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <div style={{ height: "100vh" }}>
      <DevModeApp />
      {__DEV__ && (
        <>
          {/*<Devtools initiallyOpen />*/}
          <hr />
        </>
      )}
      {/*<AutoConfiguredDevtools/>*/}
      {/*<DevtoolsV2 />*/}
    </div>
  </React.StrictMode>
);
