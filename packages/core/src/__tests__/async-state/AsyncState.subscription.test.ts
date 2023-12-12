import { AsyncState, Status } from "../..";
import { timeout } from "./test-utils";
import { mockDateNow, TESTS_TS } from "../utils/setup";

// @ts-ignore
jest.useFakeTimers("modern");
mockDateNow();

describe("AsyncState - subscriptions", () => {
	it("should subscribe to async-state and get notified", async () => {
		// given
		let myConfig = { initialValue: null, resetStateOnDispose: true };
		let key = "simulated";
		let subscriptionFn = jest.fn();
		let producer = timeout(50, "Some Value");

		// when
		let myAsyncState = new AsyncState(key, producer, myConfig);

		// then
		expect(myAsyncState.subsIndex).toBe(null);

		let unsubscribe = myAsyncState.actions.subscribe({ cb: subscriptionFn });
		expect(typeof unsubscribe).toBe("function");

		myAsyncState.actions.run();
		await jest.advanceTimersByTime(50);

		expect(subscriptionFn.mock.calls).toEqual([
			[
				{
					props: {
						args: [],
						payload: {},
					},
					prev: {
						data: null,
						props: null,
						status: "initial",
						timestamp: 1487076708000,
					},
					data: null,
					timestamp: TESTS_TS,
					status: "pending",
				},
			],
			[
				{
					props: {
						args: [],
						payload: {},
					},
					data: "Some Value",
					timestamp: TESTS_TS,
					status: "success",
				},
			],
		]);
		expect(subscriptionFn).toHaveBeenCalledTimes(2);
		expect(myAsyncState.state).toEqual({
			props: {
				args: [],
				payload: {},
			},
			status: "success",
			data: "Some Value",
			timestamp: TESTS_TS,
		});
	});
	it("should subscribe to async-state and unsubscribe before success and dispose when no subscribers", async () => {
		// given
		let key = "simulated-2";
		let subscriptionFn = jest.fn();
		let myConfig = { initialValue: null, resetStateOnDispose: true };
		let producer = timeout(50, "Some Value");

		// when
		let myAsyncState = new AsyncState(key, producer, myConfig);
		let unsubscribe = myAsyncState.actions.subscribe({ cb: subscriptionFn });

		// then

		myAsyncState.actions.run();
		await jest.advanceTimersByTime(49);
		unsubscribe!(); // unsubscribe one milli before resolve; we should only receive the pending notification
		await jest.advanceTimersByTime(5);

		expect(subscriptionFn.mock.calls).toEqual([
			[
				{
					props: {
						args: [],
						payload: {},
					},
					prev: {
						data: null,
						props: null,
						status: "initial",
						timestamp: TESTS_TS,
					},
					data: null,
					status: "pending",
					timestamp: TESTS_TS,
				},
			],
		]);
		expect(subscriptionFn).toHaveBeenCalledTimes(1);
		expect(myAsyncState.state).toEqual({
			props: null,
			status: "initial",
			data: null,
			timestamp: TESTS_TS,
		});
	});
	it("should subscribe to async-state and unsubscribe before running", async () => {
		// given
		let key = "simulated-3";
		let subscriptionFn = jest.fn();
		let myConfig = { initialValue: null };
		let producer = timeout(50, "Some Value");

		// when
		let myAsyncState = new AsyncState(key, producer, myConfig);
		let unsubscribe = myAsyncState.actions.subscribe({ cb: subscriptionFn });
		unsubscribe!();

		// then

		myAsyncState.actions.run();
		await jest.advanceTimersByTime(50);

		expect(subscriptionFn.mock.calls).toEqual([]);
		expect(subscriptionFn).toHaveBeenCalledTimes(0);
		expect(myAsyncState.state).toEqual({
			// original async state resolved, but we got notified neither by pending nor success
			props: {
				args: [],
				payload: {},
			},
			status: "success",
			data: "Some Value",
			timestamp: TESTS_TS,
		});
	});
});
