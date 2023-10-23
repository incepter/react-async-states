import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useAsync } from "../../useAsync";
import AsyncStateComponent from "../utils/AsyncStateComponent";
import { createSource } from "async-states";

describe("should subscribe to a module level source object", () => {
	it("should share state by source between two components", () => {
		// given
		const source = createSource<number, any, any, any[]>("counter-2", null, {
			initialValue: 0,
		});

		function Controls() {
			useAsync(source);

			return (
				<div>
					<button
						data-testid="increment"
						onClick={() => source.run((old) => old.data + 1)}
					>
						increment
					</button>
					<button
						data-testid="decrement"
						onClick={() => source.run((old) => old.data - 1)}
					>
						decrement
					</button>
				</div>
			);
		}

		function Test() {
			return (
				<>
					<Controls />
					<AsyncStateComponent config={source}>
						{({ state }) => <span data-testid="count-a">{state.data}</span>}
					</AsyncStateComponent>
					<AsyncStateComponent config={source}>
						{({ state }) => <span data-testid="count-b">{state.data}</span>}
					</AsyncStateComponent>
				</>
			);
		}

		// when
		jest.useFakeTimers();
		render(
			<React.StrictMode>
				<Test />
			</React.StrictMode>
		);
		const incrementBtn = screen.getByTestId("increment");
		const decrementBtn = screen.getByTestId("decrement");

		// then
		expect(screen.getByTestId("count-a").innerHTML).toEqual("0");
		expect(screen.getByTestId("count-b").innerHTML).toEqual("0");

		act(() => {
			fireEvent.click(incrementBtn);
		});

		expect(screen.getByTestId("count-a").innerHTML).toEqual("1");
		expect(screen.getByTestId("count-b").innerHTML).toEqual("1");

		fireEvent.click(decrementBtn);

		expect(screen.getByTestId("count-a").innerHTML).toEqual("0");
		expect(screen.getByTestId("count-b").innerHTML).toEqual("0");
	});
});
