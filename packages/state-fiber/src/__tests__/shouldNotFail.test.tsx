import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useAsync, useFiber } from "../react/FiberHooks";
import { expect } from "@jest/globals";
import { waitFor } from "@testing-library/dom";
import { doesNodeExist, flushPromises } from "./utils";
import { FnProps } from "../core/_types";

describe("should render useAsync and useFiber correctly", () => {
	let initialRendersCount = { "1": 0, "2": 0, "3": 0 };
	async function getCurrentNumberProducer(
		props: FnProps<number, [number], never, never>
	) {
		await new Promise((res) => setTimeout(res, 100));
		return props.args[0];
	}
	it("Should use useAsync and useFiber and sync two separate Suspense boundaries", async () => {
		jest.useFakeTimers();
		let userIds = [1, 2, 3];
		let renderCount = { ...initialRendersCount };
		let resetRendersCount = () => (renderCount = { ...initialRendersCount });

		function Test() {
			let [id, setId] = React.useState(1);
			return (
				<div>
					<React.Suspense
						fallback={<span data-testid="suspense-1">Pending...</span>}
					>
						<Buttons setId={setId} />
						<Component1 userId={id} />
						<Component2 userId={id} />
					</React.Suspense>
					<Component3 userId={id} />
				</div>
			);
		}
		function Buttons({ setId }) {
			return (
				<div>
					{userIds.map((u) => (
						<SetUserButton key={u} id={u} setUserId={setId} />
					))}
				</div>
			);
		}
		function SetUserButton({ id, setUserId }) {
			let [isPending, start] = React.useTransition();
			return (
				<button
					disabled={isPending}
					data-testid={`button_${id}`}
					className={isPending ? "pending" : ""}
					onClick={() => start(() => setUserId(id))}
				>
					{id}
				</button>
			);
		}

		function Component1({ userId }) {
			renderCount["1"] += 1;
			let result = useAsync({
				key: "test",
				lazy: false,
				args: [userId],
				initialValue: 0,
				producer: getCurrentNumberProducer,
			});

			return <span data-testid={`success_1`}>{result.data}</span>;
		}

		function Component2({ userId }) {
			renderCount["2"] += 1;
			let result = useFiber({
				key: "test",
				args: [userId],
				producer: getCurrentNumberProducer,
			});

			if (result.isPending) {
				return (
					<>
						<span data-testid={`pending_2_props`}>{userId}</span>
						<span data-testid={`pending_2_optimistic`}>
							{result.state.props.args[0]}
						</span>
					</>
				);
			}
			return <span data-testid={`success_2`}>{result.data}</span>;
		}
		function Component3({ userId }) {
			renderCount["3"] += 1;
			let result = useFiber({
				key: "test",
				args: [userId],
				producer: getCurrentNumberProducer,
			});

			if (result.isPending) {
				return (
					<>
						<span data-testid={`pending_3_props`}>{userId}</span>
						<span data-testid={`pending_3_optimistic`}>
							{result.state.props.args[0]}
						</span>
					</>
				);
			}
			return <span data-testid={`success_3`}>{result.data}</span>;
		}

		// when

		render(
			<React.StrictMode>
				<Test />
			</React.StrictMode>
		);
		// initially, data doesn't exist, useAsync would suspend
		expect(renderCount["1"]).toBe(1); // did suspend
		expect(renderCount["2"]).toBe(0); // did not render at all
		expect(renderCount["3"]).toBe(2); // strict mode
		expect(screen.getByTestId("suspense-1").innerHTML).toEqual("Pending...");
		expect(doesNodeExist("success_1")).toBe(false);
		expect(doesNodeExist("success_2")).toBe(false);
		expect(doesNodeExist("pending_2_props")).toBe(false);
		expect(doesNodeExist("pending_2_optimistic")).toBe(false);
		expect(screen.getByTestId("pending_3_props").innerHTML).toEqual("1");
		expect(screen.getByTestId("pending_3_optimistic").innerHTML).toEqual("1");

		resetRendersCount();
		await jest.advanceTimersByTime(99);
		// verify same state

		expect(renderCount["1"]).toBe(0);
		expect(renderCount["2"]).toBe(0);
		expect(renderCount["3"]).toBe(0);
		expect(screen.getByTestId("suspense-1").innerHTML).toEqual("Pending...");
		expect(doesNodeExist("success_1")).toBe(false);
		expect(doesNodeExist("success_2")).toBe(false);
		expect(doesNodeExist("pending_2_props")).toBe(false);
		expect(doesNodeExist("pending_2_optimistic")).toBe(false);
		expect(screen.getByTestId("pending_3_props").innerHTML).toEqual("1");
		expect(screen.getByTestId("pending_3_optimistic").innerHTML).toEqual("1");

		resetRendersCount();
		await jest.advanceTimersByTime(1);
		// now that the promise did resolve, react won't be recovering right away
		// it will take a few time to recover, this delay is arbitrary and we
		// should not rely on it either ways, so, wait for it
		await waitFor(() => screen.getByTestId("success_1"));
		expect(renderCount["1"]).toBe(2);
		expect(renderCount["2"]).toBe(2);
		expect(renderCount["3"]).toBe(2);
		expect(doesNodeExist("suspense-1")).toBe(false);
		expect(doesNodeExist("success_1")).toBe(true);
		expect(doesNodeExist("success_2")).toBe(true);
		expect(doesNodeExist("pending_2_props")).toBe(false);
		expect(doesNodeExist("pending_3_props")).toBe(false);
		expect(doesNodeExist("pending_2_optimistic")).toBe(false);
		expect(doesNodeExist("pending_3_optimistic")).toBe(false);
		expect(screen.getByTestId("success_1").innerHTML).toEqual("1");
		expect(screen.getByTestId("success_2").innerHTML).toEqual("1");
		expect(screen.getByTestId("success_3").innerHTML).toEqual("1");

		// load user 2

		let user2 = screen.getByTestId("button_2");
		let user3 = screen.getByTestId("button_3");

		resetRendersCount();
		fireEvent.click(user2);

		await act(async () => {
			await flushPromises();
		});

		// now, react will render under a 'Transition', and since it won't paint
		// this means that the app rendered because top level userId changed
		// which means that the tree is rendered under a transition with previous
		// props and state.
		expect(renderCount["1"]).toBe(1);
		expect(renderCount["2"]).toBe(0);
		expect(renderCount["3"]).toBe(2);
		expect(user2.getAttribute("class")).toBe("pending");
		expect(doesNodeExist("suspense-1")).toBe(false);
		expect(doesNodeExist("success_1")).toBe(true);
		expect(screen.getByTestId("success_1").innerHTML).toEqual("1");
		expect(screen.getByTestId("success_2").innerHTML).toEqual("1");
		expect(screen.getByTestId("success_3").innerHTML).toEqual("1");

		// react will then recover in setTimeout, so we advance by 0 and then try
		resetRendersCount();
		await act(async () => {
			await jest.advanceTimersByTime(0);
		});

		expect(user3.getAttribute("class")).toBe("");
		expect(user2.getAttribute("class")).toBe("pending");
		expect(screen.getByTestId("pending_2_props").innerHTML).toEqual("1");
		expect(screen.getByTestId("pending_3_props").innerHTML).toEqual("1");
		expect(screen.getByTestId("pending_2_optimistic").innerHTML).toEqual("2");
		expect(screen.getByTestId("pending_3_optimistic").innerHTML).toEqual("2");
		// await waitFor(() => screen.getByTestId("pending_3_optimistic"));

		expect(renderCount["1"]).toBe(1);
		// pending render that breaks its transition (scheduled render due to run)
		expect(renderCount["2"]).toBe(2);
		// renders twice: 1. render from App, 2. scheduled render due to run
		// todo: optimize this and make one single render (bailout scheduled)
		expect(renderCount["3"]).toBe(4);

		// now we will interrupt the pending state for user 2, and go to user 3

		// load user 2
		resetRendersCount();
		fireEvent.click(user3);

		// now, react will render under a 'Transition', so it won't render the
		// userId 3 yet, because it suspended in component 1
		expect(renderCount["1"]).toBe(1);
		expect(renderCount["2"]).toBe(0);
		expect(renderCount["3"]).toBe(2);
		expect(user2.getAttribute("class")).toBe("pending");
		expect(user3.getAttribute("class")).toBe("pending");
		expect(doesNodeExist("success_1")).toBe(true);
		expect(screen.getByTestId("pending_2_props").innerHTML).toEqual("1");
		expect(screen.getByTestId("pending_3_props").innerHTML).toEqual("1");
		expect(screen.getByTestId("pending_2_optimistic").innerHTML).toEqual("2");
		expect(screen.getByTestId("pending_3_optimistic").innerHTML).toEqual("2");
		// await waitFor(() => screen.getByTestId("pending_3_optimistic"));

		expect(renderCount["1"]).toBe(1);
		expect(renderCount["2"]).toBe(0);
		expect(renderCount["3"]).toBe(2);

		// react will then recover in setTimeout, so we advance by 0 and then try
		resetRendersCount();
		await act(async () => {
			await jest.advanceTimersByTime(0);
		});

		expect(renderCount["1"]).toBe(1);
		// pending render that breaks its transition (scheduled render due to run)
		expect(renderCount["2"]).toBe(2);
		// renders twice: 1. render from App, 2. scheduled render due to run
		// todo: optimize this and make one single render (bailout scheduled)
		expect(renderCount["3"]).toBe(4);
		expect(user2.getAttribute("class")).toBe("pending");
		expect(user3.getAttribute("class")).toBe("pending");
		expect(doesNodeExist("success_1")).toBe(true);
		expect(screen.getByTestId("pending_2_props").innerHTML).toEqual("1");
		expect(screen.getByTestId("pending_3_props").innerHTML).toEqual("1");
		expect(screen.getByTestId("pending_2_optimistic").innerHTML).toEqual("3");
		expect(screen.getByTestId("pending_3_optimistic").innerHTML).toEqual("3");

		// keep going and resolve pending
		resetRendersCount();
		await act(async () => {
			await jest.advanceTimersByTime(100);
		});

		// now that the promise did resolve, react won't be recovering right away
		// it will take a few time to recover, this delay is arbitrary and we
		// should not rely on it either ways, so, wait for it
		await waitFor(() => screen.getByTestId("success_1"));
		expect(user2.getAttribute("class")).toBe("");

		expect(renderCount["1"]).toBe(2);
		expect(renderCount["2"]).toBe(2);
		expect(renderCount["3"]).toBe(2);
		expect(doesNodeExist("suspense-1")).toBe(false);
		expect(doesNodeExist("success_1")).toBe(true);
		expect(doesNodeExist("success_2")).toBe(true);
		expect(doesNodeExist("pending_2_props")).toBe(false);
		expect(doesNodeExist("pending_3_props")).toBe(false);
		expect(doesNodeExist("pending_2_optimistic")).toBe(false);
		expect(doesNodeExist("pending_3_optimistic")).toBe(false);
		expect(screen.getByTestId("success_1").innerHTML).toEqual("3");
		expect(screen.getByTestId("success_2").innerHTML).toEqual("3");
		expect(screen.getByTestId("success_3").innerHTML).toEqual("3");
	});
});
