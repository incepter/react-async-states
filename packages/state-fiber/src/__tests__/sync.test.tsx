import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useData } from "../react/FiberHooks";
import { expect } from "@jest/globals";
import { doesNodeExist } from "./utils";

describe("should perform basic sync form separately", () => {
	it("Should basic useData", async () => {
		let actions;
		let renderCount = 0;
		jest.useFakeTimers();

		function Test() {
			renderCount += 1;
			let [data, source] = useData({
				initialValue: "",
				key: "sync-basic",
			});
			actions = source;
			return (
				<>
					<span data-testid="input-res">{data}</span>
					<input
						data-testid="input"
						onChange={(e) => source.setData(e.target.value)}
					/>
				</>
			);
		}

		render(
			<React.StrictMode>
				<Test />
			</React.StrictMode>
		);

		let input = screen.getByTestId("input");
		let inputResult = screen.getByTestId("input-res");

		expect(renderCount).toBe(2);
		expect(inputResult.innerHTML).toEqual("");

		renderCount = 0;
		act(() => {
			fireEvent.change(input, { target: { value: "aa" } });
		});

		expect(renderCount).toBe(2);
		expect(inputResult.innerHTML).toEqual("aa");

		renderCount = 0;
		act(() => {
			actions.setData("Hello");
		});

		expect(renderCount).toBe(2);
		expect(inputResult.innerHTML).toEqual("Hello");
	});
	it("Should basic error boundary", async () => {
		let actions;
		let renderCount = 0;
		jest.useFakeTimers();

		class ErrorBoundary extends React.Component<{ children }> {
			state = { error: null };
			static getDerivedStateFromError(error) {
				return { error };
			}
			render() {
				if (this.state.error) {
					return (
						<span data-testid="error-boundary">{String(this.state.error)}</span>
					);
				}
				return this.props.children;
			}
		}

		function Test() {
			renderCount += 1;
			let [data, source] = useData({
				key: "error-basic",
				initialValue: "data",
			});
			actions = source;
			return (
				<>
					<span data-testid="input-res">{data}</span>
				</>
			);
		}

		render(
			<React.StrictMode>
				<ErrorBoundary>
					<Test />
				</ErrorBoundary>
			</React.StrictMode>
		);

		expect(doesNodeExist("error-boundary")).toBeFalsy();
		expect(screen.getByTestId("input-res").innerHTML).toBe("data");

		let consoleSpy = jest.fn();
		act(() => {
			actions.setError(new Error("Blow the tree"));
		});

		expect(doesNodeExist("input-res")).toBeFalsy();
		expect(screen.getByTestId("error-boundary").innerHTML).toBe(
			"Error: Blow the tree"
		);
	});
});
