import * as React from "react";
import { useV2 } from "react-async-states/src";

export default function V2() {
	let rerender = React.useState({})[1];
	console.time("v2")
	let result = useV2({
		key: "hello",
		initialValue: 0,
	});
	console.timeEnd("v2")
	console.log("useV2", result);
	return (
		<div>
			Data: {result.data as string};
			<br />
			Error: {result.error?.toString()}
			<br />
			<button
				onClick={() => {
					result.source.setData((prev) => prev + 1);
				}}
			>
				setData
			</button>
			<button onClick={() => rerender({})}>rerender</button>
			<button
				onClick={() => {
					result.source.setError(new Error("OKOK"));
				}}
			>
				setError
			</button>
		</div>
	);
}
