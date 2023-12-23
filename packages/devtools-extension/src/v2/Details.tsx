import { AnyInstance } from "./NpmDevtools";
import { useData } from "react-async-states";
import { useDevtoolsAgent } from "./Context";
import { useAsync } from "react-async-states/src";
import { devtoolsSubscriptionKey } from "./constants";

export function CurrentInstanceDetails() {
	let agent = useDevtoolsAgent();
	let source = agent.current.actions;
	let { data: instance } = useData(source);
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
			subscriptionKey: devtoolsSubscriptionKey,
		},
		[instance.actions]
	);

	let subscriptions = Object.keys(instance.subscriptions ?? {}).filter(
		(t) => !t.startsWith(devtoolsSubscriptionKey)
	);
	return (
		<pre>
			{JSON.stringify(
				{
					id: instance.id,
					status: state.status,

					data: state.data,
					subs: subscriptions,
				},
				null,
				4
			)}
		</pre>
	);
}
