import React from "react";
import {
	currentView,
	InstanceDetails,
	instanceDetails,
	InstancePlaceholder,
	InstancesList,
	instancesList,
} from "./sources";
import { Status, useAsync, State } from "react-async-states";

export default function Sider() {
	let { state } = useAsync(instancesList);
	// console.log('this is sider', useAsync(shapeSource).state.data);

	if (state.status !== Status.success) {
		return null;
	}

	let instancesToDisplay = formatInstances(state.data);
	return (
		<div className="sider-root-mediator scroll-y-auto">
			<div className="sider-root">
				{Object.entries(instancesToDisplay).map(([key, instances]) => (
					<section key={key}>
						<InstanceGroupDetails display={key} instances={instances} />
					</section>
				))}
			</div>
		</div>
	);
}

function formatInstances(instances: InstancesList) {
	let entries = Object.entries(instances);

	let sorted = entries.sort(sortLastUpdatedDesc);

	let grouped = sorted.reduce((result, [uniqueId, details]) => {
		if (!result[details.key]) {
			result[details.key] = {};
		}
		result[details.key][uniqueId] = details;
		return result;
	}, {} as Record<string, Record<string, InstancePlaceholder>>);

	return grouped;
}

function sortLastUpdatedDesc([, aDetails], [, bDetails]) {
	if (!aDetails || !bDetails) {
		return 0;
	}

	if (aDetails.lastUpdate && bDetails.lastUpdate) {
		return bDetails.lastUpdate - aDetails.lastUpdate;
	}
	if (aDetails.lastUpdate && !bDetails.lastUpdate) {
		return -1;
	}
	if (!aDetails.lastUpdate && bDetails.lastUpdate) {
		return 1;
	}

	return 0;
}

const InstanceGroupDetails = React.memo<{
	instances: Record<string, InstancePlaceholder>;
	display: string;
}>(function InstanceGroupDetails(props) {
	const {
		state: { data },
	} = useAsync(currentView);
	let entries = Object.entries(props.instances).sort(sortLastUpdatedDesc);
	return (
		<section>
			<summary>{props.display}</summary>
			<div className="sider-group">
				{entries.map(([uniqueId, instance]) => (
					<InstanceDetailsView
						current={uniqueId == data}
						key={uniqueId}
						instance={instance}
					/>
				))}
			</div>
		</section>
	);
});

function getBackgroundColorFromStatus(status: Status | undefined) {
	switch (status) {
		case Status.error:
			return "#EB6774";
		case Status.initial:
			return "#DEDEDE";
		case Status.aborted:
			return "#787878";
		case Status.pending:
			return "#5B95DB";
		case Status.success:
			return "#17A449";
		default:
			return undefined;
	}
}

function getColorFromStatus(status: Status | undefined) {
	switch (status) {
		case Status.error:
			return "white";
		case Status.initial:
			return "black";
		case Status.aborted:
			return "white";
		case Status.pending:
			return "white";
		case Status.success:
			return "white";
		default:
			return undefined;
	}
}

const InstanceDetailsView = React.memo(function InstanceDetailsView(props: {
	current: boolean;
	instance: InstancePlaceholder;
}) {
	let uniqueId = props.instance.uniqueId;

	let { state } = useAsync.auto(
		{
			source: instanceDetails.getLane(`${uniqueId}`),
			payload: { uniqueId: uniqueId },
		},
		[uniqueId]
	);

	let subscriptionsCount = selectSubscriptionsCount(state);

	let key = props.instance.key;
	let title = `${key} - ${uniqueId}`;
	let status = state.data?.state?.status;
	let styleToAdd: any = {};
	if (props.current) {
		styleToAdd.backgroundColor = "#5e9ad9";
	}
	return (
		<button
			title={title}
			onClick={() => currentView.setState(`${uniqueId}`)}
			className={"devtools-button sider-key-root devtools-side-button"}
			style={styleToAdd}
		>
			<span>{key}</span>
			<span
				title={`status=${status}, subscriptions count=${subscriptionsCount}`}
				style={{
					color: getColorFromStatus(status),
					backgroundColor: getBackgroundColorFromStatus(status),
				}}
				className="sider-key-subscriptions"
			>
				{Object.is(subscriptionsCount, Number.NaN) ? "" : subscriptionsCount}
			</span>
		</button>
	);
});

function selectSubscriptionsCount(
	state: State<InstanceDetails | null, any, any>
) {
	if (!state || !state.data) {
		return Number.NaN;
	}
	return state.data.subscriptions?.length || 0;
}
