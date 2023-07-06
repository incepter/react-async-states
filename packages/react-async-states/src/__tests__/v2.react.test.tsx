import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { createSource } from "../v2/source";
import { useAsync } from "../v2/react";

let index = 0;
function getKey() {
	return `test-${++index}`;
}

describe("v2 react part", () => {
	it("should perform the most basic API form", () => {
		const testKey = getKey();
		const unboundSource = createSource(testKey, undefined, {
			initialValue: "Hello",
		});

		function Component() {
			const { data } = useAsync(unboundSource);

			return <span data-testid="data">{data}</span>;
		}
		// when
		render(
			<React.StrictMode>
				<Component />
			</React.StrictMode>
		);

		expect(screen.getByTestId("data").innerHTML).toEqual("Hello");
	});
	it("should react to basic change from event handler and act", () => {
		const testKey = getKey();
		const unboundSource = createSource(testKey, undefined, {
			initialValue: 0,
		});

		function Component() {
			const { data } = useAsync(unboundSource);
			return <span data-testid="data">{String(data)}</span>;
		}
		// when
		render(
			<React.StrictMode>
				<Component />
			</React.StrictMode>
		);

		expect(screen.getByTestId("data").innerHTML).toEqual("0");

		act(() => {
			unboundSource.bind(null).setState({
				data: 1,
				status: "success",
				props: { args: [], payload: {} },
			});
		});

		expect(screen.getByTestId("data").innerHTML).toEqual("1");
	});
});
