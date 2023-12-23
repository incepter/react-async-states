import * as React from "react";
import { useDevtoolsAgent } from "./Context";
import { NpmDevtoolsAgent, SingleInstanceInfo } from "./NpmDevtools";
import { useAsync, useData } from "react-async-states";
import { ProducerProps } from "async-states";

function filterInstancesByKey(
	props: ProducerProps<SingleInstanceInfo[], [SingleInstanceInfo[], string]>
) {
	let [instances, query] = props.args;

	return instances.filter((t) =>
		t.key.toLowerCase().includes(query.toLowerCase())
	);
}

export function DevtoolsSideBar() {
	let devtools = useDevtoolsAgent();
	let { data } = useData(devtools.info.actions);
	let { data: currentInstance } = useData(devtools.current.actions);

	// let {
	// 	data: filteredInstances,
	// 	source: { run },
	// } = useAsync(
	// 	{
	// 		storeInContext: false,
	// 		hideFromDevtools: true,
	// 		runEffect: "debounce",
	// 		runEffectDurationMs: 300,
	// 		key: "filtered-instances",
	// 		producer: filterInstancesByKey,
	// 		initialValue: () => Object.values(data!),
	// 	},
	// 	[]
	// );

	return (
		<aside>
			<section className="asd-i-list">
				{/*<input*/}
				{/*	placeholder="filter by key"*/}
				{/*	className="asd-i-item-filter"*/}
				{/*	onChange={(e) => run(Object.values(data), e.target.value)}*/}
				{/*/>*/}
				{Object.values(data!).map((instance) => (
					<MemoizedInstanceInfo
						{...instance}
						agent={devtools}
						name={instance.key}
						key={`${instance.id}`}
						current={currentInstance?.id === instance.id}
					/>
				))}
			</section>
		</aside>
	);
}

type InstanceInfoProps = SingleInstanceInfo & {
	name: string;
	current: boolean;
	agent: NpmDevtoolsAgent;
};

function InstanceInfo(props: InstanceInfoProps) {
	let itemClassName = `asd-i-item asd-i-item-${props.status} ${
		props.current ? "asd-i-current" : ""
	} `;
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
