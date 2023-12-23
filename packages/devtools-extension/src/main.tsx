import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./css-v2.css";
import DevModeApp from "./DevModeApp";
import { __DEV__ } from "./utils";
import { DevtoolsLayout } from "./v2/Layout";
import { DevtoolsSideBar } from "./v2/Sidebar";
import { CurrentInstanceDetails } from "./v2/Details";

// autoConfigureDevtools({ open: true });

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<div style={{ height: "100vh" }}>
			{__DEV__ && (
				<>
					<DevModeApp />
					<hr />
				</>
			)}
			{/*<AutoConfiguredDevtools/>*/}
			<DevtoolsV2 />
		</div>
	</React.StrictMode>
);

function DevtoolsV2() {
	return (
		<DevtoolsLayout
			sidebar={<DevtoolsSideBar />}
			details={<CurrentInstanceDetails />}
		/>
	);
}
