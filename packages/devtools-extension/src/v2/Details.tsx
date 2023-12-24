import * as React from "react";
import {AnyInstance} from "./NpmDevtools";
import {State, useAsync, useData} from "react-async-states";
import {useDevtoolsAgent} from "./Context";
import {devtoolsSubscriptionKey} from "./constants";
import JsonView, {Json} from "../DevtoolsView/Json";

export function CurrentInstanceDetails_Internal() {
	let agent = useDevtoolsAgent();
	let source = agent.current.actions;
	let { data: instance } = useData(source);
	if (instance === null) {
		return null;
	}
	return <InstanceDetails instance={instance} />;
}

export const CurrentInstanceDetails = React.memo(
	CurrentInstanceDetails_Internal
);

let options = {
	day: "2-digit",
	month: "2-digit",
	year: "numeric",
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit",
	hour12: false,
	timeZoneName: "long",
} as Intl.DateTimeFormatOptions;
let formatter = new Intl.DateTimeFormat("en-US", options);
let detailsSubKey = `${devtoolsSubscriptionKey}-details`;

type DetailsViews = {
	state: boolean;
	cache: boolean;
	config: boolean;
	journal: boolean;
};
let initialViews = {
	state: true,
	config: true,
	cache: false,
	journal: false,
};

function InstanceDetails({ instance }: { instance: AnyInstance }) {
	let [views, setViews] = React.useState<DetailsViews>(initialViews);
	let { state } = useAsync(
		{
			source: instance.actions,
			subscriptionKey: detailsSubKey,
		},
		[instance.actions]
	);

	return (
		<div className="asd-d-root">
			<div className="asd-d-h">
				<span>{instance.key}</span>
				<ViewsButtons views={views} setViews={setViews} />
			</div>
			<div className="asd-d-d">
				{views.state && <MemoizedStateView instance={instance} state={state} />}
				{views.config && <MemoizedConfig config={instance.config} />}
				{views.cache && <MemoizedCache instance={instance} />}
			</div>
		</div>
	);
}

const ViewsButtons = React.memo(function ViewsButtons({
	views,
	setViews,
}: {
	views: DetailsViews;
	setViews: React.Dispatch<React.SetStateAction<DetailsViews>>;
}) {
	return (
		<>
			<button
				onClick={() => {
					setViews((prev) => ({ ...prev, state: !prev.state }));
				}}
				className={`${views.state ? "asd-d-h-b-active" : ""}`}
			>
				State
			</button>
			<button
				onClick={() => {
					setViews((prev) => ({ ...prev, config: !prev.config }));
				}}
				className={`${views.config ? "asd-d-h-b-active" : ""}`}
			>
				Config
			</button>
			<button
				onClick={() => {
					setViews((prev) => ({ ...prev, journal: !prev.journal }));
				}}
				className={`${views.journal ? "asd-d-h-b-active" : ""}`}
			>
				Journal
			</button>
			<button
				onClick={() => {
					setViews((prev) => ({ ...prev, cache: !prev.cache }));
				}}
				className={`${views.cache ? "asd-d-h-b-active" : ""}`}
			>
				Cache
			</button>
		</>
	);
});

const MemoizedStateView = React.memo(function StateView({
	instance,
	state,
}: {
	instance: AnyInstance;
	state: State<any, any, any>;
}) {
	let memoizedState = React.useMemo(() => {
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
	return <JsonView src={memoizedState} name="State" />;
});

const MemoizedConfig = React.memo(function StateView({
	config,
}: {
	config: AnyInstance["config"];
}) {
	return <JsonView src={config} name="Config" />;
});

const MemoizedCache = React.memo(function MemoizedCache({
	instance,
}: {
	instance: AnyInstance;
}) {
	let [key, rerender] = React.useState(0);

	React.useEffect(() => {
		return instance.actions.on("cache-change", (newCache) => {
			rerender((prev) => prev + 1);
		});
	}, [instance]);
	return <Json key={key} src={instance.cache} name="Cache" level={3} />;
});

function getStateData(state: State<any, any, any>) {
	if (state.status === "error") {
		if (typeof state.data?.toString === "function") {
			return state.data.toString();
		}
	}
	return state.data;
}
