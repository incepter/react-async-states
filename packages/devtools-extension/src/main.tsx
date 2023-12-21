import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import DevModeApp from "./DevModeApp";
import { __DEV__ } from "./utils";
import { AutoConfiguredDevtools, autoConfigureDevtools } from "./index";
import { NpmLibraryDevtoolsClient } from "./v2/NpmDevtools";
import { useData } from "react-async-states";

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
	let [devtools] = React.useState(() => new NpmLibraryDevtoolsClient());
	let { data } = useData(devtools.info.actions);
	console.log("____render");

	React.useEffect(() => {
		devtools.connect();

		return () => devtools.disconnect();
	}, [devtools]);

	return (
		<details open>
			<summary>Devtools</summary>
			<pre>{JSON.stringify(data, null, 4)}</pre>
		</details>
	);
}
