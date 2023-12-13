import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useAsync } from "../../hooks/useAsync_export";
import {
	createSource,
	ErrorState,
	InitialState,
	PendingState,
	State,
	SuccessState,
} from "async-states";

describe("useAsync - events", () => {
	it("add several change events with different forms", async () => {
		// given

		const mockedFn = jest.fn();
		const mockedFn2 = jest.fn();
		const mockedFn3 = jest.fn();
		const counterSource = createSource<number, any, any[]>("counter", null, {
			initialValue: 0,
		});

		function Component({ subKey }: { subKey: string }) {
			const {
				source: { key, run },
				state,
			} = useAsync({
				source: counterSource,
				events: {
					change: [
						mockedFn,
						{
							handler: mockedFn2,
							status: "success",
						},
						{
							handler: mockedFn3,
							status: "error",
						},
					],
				},
			});

			return (
				<div>
					<button
						data-testid={`increment-${key}`}
						onClick={() => run((old) => old.data + 1)}
					>
						Increment
					</button>
					<button
						data-testid={`force-error-${key}`}
						onClick={() => run(0, "error")}
					>
						run error
					</button>
					<span data-testid={`result-${key}`}>{state.data}</span>
				</div>
			);
		}

		// when
		render(
			<React.StrictMode>
				<Component subKey="counter" />
			</React.StrictMode>
		);

		// then

		expect(screen.getByTestId("result-counter").innerHTML).toEqual("0");
		expect(mockedFn).not.toHaveBeenCalled();
		expect(mockedFn2).not.toHaveBeenCalled();
		expect(mockedFn3).not.toHaveBeenCalled();

		mockedFn.mockClear();
		mockedFn2.mockClear();
		mockedFn3.mockClear();

		act(() => {
			fireEvent.click(screen.getByTestId("increment-counter"));
		});
		expect(screen.getByTestId("result-counter").innerHTML).toEqual("1");

		expect(mockedFn).toHaveBeenCalled();
		expect(mockedFn2).toHaveBeenCalled();
		expect(mockedFn3).not.toHaveBeenCalled();
		mockedFn.mockClear();
		mockedFn2.mockClear();
		mockedFn3.mockClear();

		act(() => {
			fireEvent.click(screen.getByTestId("force-error-counter"));
		});
		expect(mockedFn).toHaveBeenCalled();
		expect(mockedFn2).not.toHaveBeenCalled();
		expect(mockedFn3).toHaveBeenCalled();
	});
	it("should invoke onChange event added on render", async () => {
		// given
		let spy = jest.fn();
		const source = createSource<number, any, any[]>("test-2", null, {
			initialValue: 0,
		});

		function Component() {
			const { onChange } = useAsync(source);
			onChange([({ state: newState }) => spy(newState.data)]);
			return null;
		}

		// when
		render(
			<React.StrictMode>
				<Component />
			</React.StrictMode>
		);

		act(() => {
			source.setState(2);
		});
		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy).toHaveBeenCalledWith(2);
	});
	// this test doesn't have an expect, if the types change, it will fail to
	// compile
	it("should have the correct types", async () => {
		// given
		const source = createSource<number, any[], any>("test-2", null, {
			initialValue: 0,
		});

		function Component() {
			const { onChange } = useAsync({
				source,
				events: {
					change: [
						{
							status: "initial",
							handler({ state }: { state: InitialState<number, any> }) {},
						},
						{
							status: "pending",
							handler({ state }: { state: PendingState<number, any, any> }) {},
						},
						{
							status: "success",
							handler({ state }: { state: SuccessState<number, any[]> }) {},
						},
						{
							status: "error",
							handler({ state }: { state: ErrorState<number, any, any> }) {},
						},
					],
				},
			});
			onChange([
				({ state: newState }: { state: State<number, any, any> }) => {},
				{
					status: "initial",
					handler({ state }: { state: InitialState<number, any> }) {},
				},
				{
					status: "pending",
					handler({ state }: { state: PendingState<number, any, any> }) {},
				},
				{
					status: "success",
					handler({ state }: { state: SuccessState<number, any[]> }) {},
				},
				{
					status: "error",
					handler({ state }: { state: ErrorState<number, any, any> }) {},
				},
			]);
			return null;
		}

		// when
		render(
			<React.StrictMode>
				<Component />
			</React.StrictMode>
		);
	});
});
