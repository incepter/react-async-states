import * as React from "react";
import { useData, useAsync, useFiber } from "state-fiber";

export default function V2() {
	let rerender = React.useState({})[1];
	console.time("v2");
	let result = useData({
		args: [12],
		key: "hello",
		producer: test,
		initialValue: 0,
	});
	console.timeEnd("v2");
	console.log("useV2", result);
	return (
		<div>
			{/*{result.isPending && "_____________pending________________"}*/}
			{/*Data: {result.data as string};*/}
			Data: {result[0]};{/*<br />*/}
			{/*Error: {result.error?.toString()}*/}
			<br />
			<button
				onClick={() => {
					// React.startTransition(() => {
					// 	result.source.run(1);
					// });
					// result.source.run(1);
					result[1].run(1);
				}}
			>
				Run
			</button>
			<button
				onClick={() => {
					result[1].setData((prev) => prev + 1);
					// result.source.setData((prev) => prev + 1);
				}}
			>
				setData
			</button>
			<button onClick={() => rerender({})}>rerender</button>
			<button
				onClick={() => {
					result[1].setError(new Error("KKK"));
					// result.source.setError(new Error("OKOK"));
				}}
			>
				setError
			</button>
		</div>
	);
}

async function test(props) {
	console.log("producer is running using", props);
	await timeout(2000);
	return 15;
}

function timeout(delay) {
	return new Promise((res) => setTimeout(res, delay));
}
function rejectTimeout(delay) {
	return new Promise((res, rej) =>
		setTimeout(() => rej(new Error("rejected")), delay)
	);
}
