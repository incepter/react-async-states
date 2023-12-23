import * as React from "react";
import { AnyInstance } from "./NpmDevtools";
import { State, useAsync, useData } from "react-async-states";
import { useDevtoolsAgent } from "./Context";
import { devtoolsSubscriptionKey } from "./constants";
import JsonView from "../DevtoolsView/Json";

export function CurrentInstanceDetails_Internal() {
	let agent = useDevtoolsAgent();
	let source = agent.current.actions;
	let { data: instance } = useData(source);
	if (instance === null) {
		return null;
	}
	return <InstanceSub instance={instance} />;
}

export const CurrentInstanceDetails = React.memo(
	CurrentInstanceDetails_Internal
);

const options = {
	day: "2-digit",
	month: "2-digit",
	year: "numeric",
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit",
	hour12: false,
	timeZoneName: "long",
} as Intl.DateTimeFormatOptions;
const formatter = new Intl.DateTimeFormat("en-US", options);

let detailsSubKey = `${devtoolsSubscriptionKey}-details`;
function InstanceSub({ instance }: { instance: AnyInstance }) {
	let { state } = useAsync(
		{
			source: instance.actions,
			subscriptionKey: detailsSubKey,
		},
		[instance.actions]
	);

	const memoizedState = React.useMemo(() => {
		let output = {
			status: state.status,
			time: formatter.format(new Date(state.timestamp)),
			data: getStateData(state),
			props: state.props,
		} as any;
		if (state.status === "pending") {
			output.prev = state.prev;
		}
		let subscriptions = Object.keys(instance.subscriptions ?? {}).filter(
			(t) => !t.startsWith(devtoolsSubscriptionKey)
		);
		if (subscriptions.length) {
			output.subscriptions = subscriptions;
		}
		return output;
	}, [state]);

	return <JsonView src={memoizedState} name={instance.key} />;
}

function getStateData(state: State<any, any, any>) {
	if (state.status === "error") {
		if (typeof state.data?.toString === "function") {
			return state.data.toString();
		}
	}
	return state.data;
}
