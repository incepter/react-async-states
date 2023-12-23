import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./css-v2.css";
import DevModeApp from "./DevModeApp";
import { __DEV__ } from "./utils";
import {
	AnyInstance,
	NpmDevtoolsAgent,
	NpmLibraryDevtoolsClient,
	SingleInstanceInfo,
} from "./v2/NpmDevtools";
import { useAsync, useData } from "react-async-states";
import { createSource } from "async-states";

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
		<>
			<DevtoolsV2Layout />
		</>
	);
}

function DevtoolsV2Layout() {
	return (
		<div className="asd-root">
			<div className="asd-side">
				<DevtoolsSideBar />
			</div>
			<div className="asd-view">
				<InstanceDetails />
			</div>
		</div>
	);
}

function DevtoolsSideBar() {
	let [devtools] = React.useState(() => new NpmLibraryDevtoolsClient());
	let { data } = useData(devtools.info.actions);
	console.log("____render");

	React.useEffect(() => {
		devtools.connect();

		return () => devtools.disconnect();
	}, [devtools]);

	let instances = Object.values(data!);
	return (
		<aside>
			<section className="asd-i-list">
				{instances.map((instance) => (
					<MemoizedInstanceInfo
						{...instance}
						devtools={devtools}
						name={instance.key}
						key={`${instance.id}`}
					/>
				))}
			</section>
		</aside>
	);
}

let currentInstance = createSource<AnyInstance | null>(
	"$$current-instance",
	null,
	{
		initialValue: null,
		hideFromDevtools: true,
	}
);

function InstanceDetails() {
	let { data: instance } = useData(currentInstance);
	if (instance === null) {
		return null;
	}
	return (
		<details open>
			<summary>Instance {instance.key}</summary>
			<InstanceSub instance={instance} />
		</details>
	);
}

function InstanceSub({ instance }: { instance: AnyInstance }) {
	let { state } = useAsync(
		{
			source: instance.actions,
			subscriptionKey: "$$$devtools",
		},
		[instance.actions]
	);
	return (
		<pre>
			{JSON.stringify(
				{
					id: instance.id,
					status: state.status,

					data: state.data,
					subs: Object.keys(instance.subscriptions ?? {}),
				},
				null,
				4
			)}
		</pre>
	);
}

function InstanceInfo(
	props: SingleInstanceInfo & { name: string; devtools: NpmDevtoolsAgent }
) {
	let itemClassName = `asd-i-item asd-i-item-${props.status}`;
	return (
		<button
			onClick={() => {
				let instance = props.devtools.ids[props.id];
				currentInstance.setData(instance ?? null);
			}}
			type="button"
			className={itemClassName}
			key={props.id}
		>
			<span className="asd-i-name">{props.name}</span>
			<div className="asd-i-badge">{props.subCount}</div>
		</button>
	);
}
const MemoizedInstanceInfo = React.memo(InstanceInfo);
