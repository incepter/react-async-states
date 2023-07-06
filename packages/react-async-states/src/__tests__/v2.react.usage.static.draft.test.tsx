import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { createSource } from "../v2/source";
import { useAsync } from "../v2/react";
import { TestSpan, TestButton } from "./utils/TestSpan";

let index = 0;
function getKey() {
	return `test-${++index}`;
}

describe("sample usages of the v2", () => {
	it("should perform basic data and set data usage", () => {
		let rendersCount = 0;
		function Component() {
			rendersCount += 1;
			const { data, setData } = useAsync({ initialValue: 1 });
			const increment = () => setData((prev) => prev! + 1);

			return (
				<>
					<TestSpan id="data">{data}</TestSpan>
					<TestSpan id="renders">{rendersCount}</TestSpan>
					<TestButton id="change-static" onClick={() => setData(10)}>
						Add
					</TestButton>
					<TestButton id="change-updater" onClick={increment}>
						Add
					</TestButton>
				</>
			);
		}

		// when
		render(
			<React.StrictMode>
				<Component />
			</React.StrictMode>
		);

		expect(screen.getByTestId("data").innerHTML).toEqual("1");
		fireEvent.click(screen.getByTestId("change-static"));
		expect(screen.getByTestId("data").innerHTML).toEqual("10");
		fireEvent.click(screen.getByTestId("change-updater"));
		expect(screen.getByTestId("data").innerHTML).toEqual("11");
		fireEvent.click(screen.getByTestId("change-updater"));
		expect(screen.getByTestId("data").innerHTML).toEqual("12");
		expect(screen.getByTestId("renders").innerHTML).toEqual("8"); // StrictMode
	});

	it("should perform basic error and set error usage", () => {
		let rendersCount = 0;
		function Component() {
			rendersCount += 1;
			const { data, error, setError } = useAsync<number, never, string, never, never>({
				initialValue: 1,
			});
			return (
				<>
					<TestSpan id="data">{String(data)}</TestSpan>
					<TestSpan id="error">{String(error)}</TestSpan>
					<TestSpan id="renders">{rendersCount}</TestSpan>
					<TestButton id="change-static" onClick={() => setError("Error")}>
						Add
					</TestButton>
				</>
			);
		}

		// when
		render(
			<React.StrictMode>
				<Component />
			</React.StrictMode>
		);

		expect(screen.getByTestId("data").innerHTML).toEqual("undefined");
		expect(screen.getByTestId("error").innerHTML).toEqual("undefined");
		fireEvent.click(screen.getByTestId("change-static"));
		expect(screen.getByTestId("error").innerHTML).toEqual("Error");
		expect(screen.getByTestId("data").innerHTML).toEqual("undefined");
		expect(screen.getByTestId("renders").innerHTML).toEqual("4"); // StrictMode
	});
});
