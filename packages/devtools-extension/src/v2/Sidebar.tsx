import * as React from "react";
import { useDevtoolsAgent } from "./Context";
import { NpmDevtoolsAgent, SingleInstanceInfo } from "./NpmDevtools";
import { useData } from "react-async-states";

export function DevtoolsSideBar() {
	let devtools = useDevtoolsAgent();
	let { data } = useData(devtools.info.actions);

	let instances = Object.values(data!);
	return (
		<aside>
			<section className="asd-i-list">
				{instances.map((instance) => (
					<MemoizedInstanceInfo
						{...instance}
						agent={devtools}
						name={instance.key}
						key={`${instance.id}`}
					/>
				))}
			</section>
		</aside>
	);
}

type InstanceInfoProps = SingleInstanceInfo & {
	name: string;
	agent: NpmDevtoolsAgent;
};

function InstanceInfo(props: InstanceInfoProps) {
	let itemClassName = `asd-i-item asd-i-item-${props.status}`;
	return (
		<button
			onClick={() => {
				props.agent.setCurrentInstance(props.id);
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
