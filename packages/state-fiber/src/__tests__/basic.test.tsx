import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useAsync, useFiber } from "../react/FiberHooks";
import { expect } from "@jest/globals";
import { waitFor } from "@testing-library/dom";
import { doesNodeExist, flushPromises } from "./utils";
import { FnProps } from "../core/_types";

describe("should perform basic forms separately", () => {
	async function getCurrentNumberProducer(
		props: FnProps<number, [number], never, never>
	) {
		await new Promise((res) => setTimeout(res, 100));
		return props.args[0];
	}
	it("Should basic useAsync", async () => {
		jest.useFakeTimers();
		let renderCount = 0;
		let userIds = [1, 2, 3];

		function Test() {
			let [id, setId] = React.useState(1);
			return (
				<div>
					<React.Suspense
						fallback={<span data-testid="suspense-1">Pending...</span>}
					>
						<Buttons setId={setId} />
						<Component1 userId={id} />
					</React.Suspense>
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
			renderCount += 1;
			let result = useAsync({
				lazy: false,
				args: [userId],
				initialValue: 0,
				key: "test-basic-useAsync",
				producer: getCurrentNumberProducer,
			});

			return <span data-testid={`success_1`}>{result.data}</span>;
		}

		// when

		render(
			<React.StrictMode>
				<Test />
			</React.StrictMode>
		);
		// initially, data doesn't exist, useAsync would suspend
		expect(renderCount).toBe(1); // did suspend
		expect(doesNodeExist("success_1")).toBe(false);
		expect(screen.getByTestId("suspense-1").innerHTML).toEqual("Pending...");

		renderCount = 0;
		await jest.advanceTimersByTime(99);
		// verify same state

		expect(renderCount).toBe(0);
		expect(doesNodeExist("success_1")).toBe(false);
		expect(screen.getByTestId("suspense-1").innerHTML).toEqual("Pending...");

		await jest.advanceTimersByTime(1);
		// now that the promise did resolve, react won't be recovering right away
		// it will take a few time to recover, this delay is arbitrary and we
		// should not rely on it either ways, so, wait for it
		await waitFor(() => screen.getByTestId("success_1"));
		expect(renderCount).toBe(2);
		expect(doesNodeExist("success_1")).toBe(true);
		expect(doesNodeExist("suspense-1")).toBe(false);
		expect(screen.getByTestId("success_1").innerHTML).toEqual("1");

		// load user 2

		let user2 = screen.getByTestId("button_2");
		let user3 = screen.getByTestId("button_3");

		renderCount = 0;
		fireEvent.click(user2);

		await act(async () => {
			await flushPromises();
		});

		// now, react will render under a 'Transition', and since it won't paint
		// this means that the app rendered because top level userId changed
		// which means that the tree is rendered under a transition with previous
		// props and state.
		expect(renderCount).toBe(1);
		expect(doesNodeExist("success_1")).toBe(true);
		expect(doesNodeExist("suspense-1")).toBe(false);
		expect(user2.getAttribute("class")).toBe("pending");
		expect(screen.getByTestId("success_1").innerHTML).toEqual("1");

		// react will then recover in setTimeout, so we advance by 0 and then try
		await act(async () => {
			await jest.advanceTimersByTime(0);
		});

		expect(user3.getAttribute("class")).toBe("");
		expect(user2.getAttribute("class")).toBe("pending");
		expect(screen.getByTestId("success_1").innerHTML).toEqual("1");

		expect(renderCount).toBe(1);

		// now we will interrupt the pending state for user 2, and go to user 3

		// load user 3
		renderCount = 0;
		fireEvent.click(user3);

		// now, react will render under a 'Transition', so it won't render the
		// userId 3 yet, because it suspended in component 1
		expect(renderCount).toBe(1);
		expect(user2.getAttribute("class")).toBe("pending");
		expect(user3.getAttribute("class")).toBe("pending");
		expect(doesNodeExist("success_1")).toBe(true);

		expect(renderCount).toBe(1);

		// react will then recover in setTimeout, so we advance by 0 and then try
		await act(async () => {
			await jest.advanceTimersByTime(0);
		});

		expect(renderCount).toBe(1);
		expect(doesNodeExist("success_1")).toBe(true);
		expect(user2.getAttribute("class")).toBe("pending");
		expect(user3.getAttribute("class")).toBe("pending");

		// keep going and resolve pending
		renderCount = 0;
		await act(async () => {
			await jest.advanceTimersByTime(100);
		});

		// now that the promise did resolve, react won't be recovering right away
		// it will take a few time to recover, this delay is arbitrary and we
		// should not rely on it either ways, so, wait for it
		await waitFor(() => screen.getByTestId("success_1"));
		await act(async () => {
			await jest.advanceTimersByTime(1000);
		});
		expect(user2.getAttribute("class")).toBe("");

		expect(renderCount).toBe(2);
		expect(doesNodeExist("suspense-1")).toBe(false);
		expect(doesNodeExist("success_1")).toBe(true);
		expect(screen.getByTestId("success_1").innerHTML).toEqual("3");
	});
	it("Should basic useFiber", async () => {
		jest.useFakeTimers();
		let renderCount = 0;
		let userIds = [1, 2, 3];

		function Test() {
			let [id, setId] = React.useState(1);
			return (
				<div>
					<React.Suspense
						fallback={<span data-testid="suspense-1">Pending...</span>}
					>
						<Buttons setId={setId} />
						<Component2 userId={id} />
					</React.Suspense>
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

		function Component2({ userId }) {
			renderCount += 1;
			let result = useFiber({
				lazy: false,
				args: [userId],
				key: "test-basic-useFiber",
				producer: getCurrentNumberProducer,
			});

			return (
				<>
					{result.isPending && (
						<>
							<span data-testid={`pending_2_props`}>{userId}</span>
							<span data-testid={`pending_2_optimistic`}>
								{result.state.props.args[0]}
							</span>
						</>
					)}
					{result.isSuccess && (
						<span data-testid={`success_2`}>{result.data}</span>
					)}
				</>
			);
		}
		// when

		render(
			<React.StrictMode>
				<Test />
			</React.StrictMode>
		);
		expect(renderCount).toBe(4); // (initial + pending) x 2 (strict mode)
		expect(doesNodeExist("success_2")).toBe(false);
		expect(doesNodeExist("suspense-1")).toBe(false);
		expect(screen.getByTestId("pending_2_props").innerHTML).toEqual("1");
		expect(screen.getByTestId("pending_2_optimistic").innerHTML).toEqual("1");

		renderCount = 0;
		await jest.advanceTimersByTime(99);

		// verify same state
		expect(renderCount).toBe(0);
		expect(doesNodeExist("success_2")).toBe(false);

		await act(async () => {
			await jest.advanceTimersByTime(1);
			await flushPromises();
		});

		expect(renderCount).toBe(2);
		expect(doesNodeExist("success_2")).toBe(true);
		expect(doesNodeExist("suspense-1")).toBe(false);
		expect(screen.getByTestId("success_2").innerHTML).toEqual("1");

		// load user 2
		let user2 = screen.getByTestId("button_2");
		let user3 = screen.getByTestId("button_3");

		renderCount = 0;
		fireEvent.click(user2);

		await act(async () => {
			await flushPromises();
		});

		expect(renderCount).toBe(4); // two renders because userId changed, and 2 because we passed from success to pending
		expect(user2.getAttribute("class")).toBe("");
		expect(doesNodeExist("suspense-1")).toBe(false);
		expect(screen.getByTestId("pending_2_props").innerHTML).toEqual("2");
		expect(screen.getByTestId("pending_2_optimistic").innerHTML).toEqual("2");

		renderCount = 0;
		await act(async () => {
			await jest.advanceTimersByTime(0);
		});

		expect(user3.getAttribute("class")).toBe("");
		expect(user2.getAttribute("class")).toBe("");
		expect(doesNodeExist("success_2")).toBe(false);
		expect(doesNodeExist("suspense-1")).toBe(false);
		expect(screen.getByTestId("pending_2_props").innerHTML).toEqual("2");
		expect(screen.getByTestId("pending_2_optimistic").innerHTML).toEqual("2");

		expect(renderCount).toBe(0); // same as before

		// load user 3
		renderCount = 0;
		fireEvent.click(user3);

		expect(renderCount).toBe(4);
		expect(user2.getAttribute("class")).toBe("");
		expect(user3.getAttribute("class")).toBe("");
		expect(doesNodeExist("success_2")).toBe(false);

		expect(renderCount).toBe(4); // same: userId + pending x 2 (strict mode)

		await act(async () => {
			await jest.advanceTimersByTime(0);
		});

		expect(user2.getAttribute("class")).toBe("");
		expect(user3.getAttribute("class")).toBe("");
		expect(doesNodeExist("success_2")).toBe(false);

		// keep going and resolve pending
		renderCount = 0;
		await act(async () => {
			await jest.advanceTimersByTime(100);
		});

		expect(renderCount).toBe(2);
		expect(user2.getAttribute("class")).toBe("");
		expect(doesNodeExist("success_2")).toBe(true);
		expect(doesNodeExist("suspense-1")).toBe(false);
		expect(screen.getByTestId("success_2").innerHTML).toEqual("3");
	});
});
