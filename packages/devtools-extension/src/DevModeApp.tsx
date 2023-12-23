import * as React from "react";
import { createSource, useAsync, Status } from "react-async-states";

let src = createSource<number>("test-2", null, { initialValue: 0 });
let src2 = createSource<number>("test-1", null, { initialValue: 0 })
	.getLane("test-1-lane")
	.getLane("test-1-lane-lane-nested");

// @ts-ignore
src.setState(new Error(""), "error");
src2.setState(null, "pending");

let meter = 0;

let source = createSource<number, [number], any>("devmodeapp", null, {
	initialValue: 0,
});

function DevModeApp({ alias }) {
	const { state } = useAsync({
		source,
		lazy: false,
		autoRunArgs: [++meter],
		condition: (actualState) => actualState.status === "initial",
	});
	return (
		<button onClick={() => source.setState((old) => old.data + 1)}>
			{alias} - {state.data}
		</button>
	);
}

function intevalProducer(props) {
	let id = setInterval(() => {
		props.emit((old) => {
			return old.data + 1;
		});
	}, props.payload.delay);
	props.onAbort(() => clearInterval(id));

	return props.lastSuccess.data;
}

function Interval({ alias, delay }) {
	const source = React.useMemo(
		() =>
			createSource<number, [number], any>(alias, intevalProducer, {
				initialValue: 0,
			}),
		[]
	);
	const { state } = useAsync.auto({ source, payload: { delay } }, [delay]);
	return (
		<button onClick={() => source.setState((old) => old.data + 1)}>
			Interval {alias} - {state.data}
		</button>
	);
}

export default function DevModeAppExp() {
	return (
		<>
			<DevModeApp alias="devmodeapp" />
			<hr />
			<DevModeApp alias="random" />
			<hr />
			<Interval alias="interval-demo" delay={3000} />
		</>
	);
}
