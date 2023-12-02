import { AsyncState } from "../../AsyncState";
import { mockDateNow } from "../utils/setup";
import { Status } from "../../enums";
import { expect } from "@jest/globals";
import { flushPromises } from "../utils/test-utils";

// @ts-ignore
jest.useFakeTimers("modern");
mockDateNow();
describe("AsyncState instance run", () => {
	it("should skip replacing state when a pending update and want to go to pending again", () => {
		let instance = new AsyncState(
			"state-1",
			() => new Promise((res) => res(1)),
			{
				skipPendingDelayMs: 500,
			}
		);
		expect(instance.pendingUpdate).toBe(null);
		instance.actions.run();
		let timeoutId = instance.pendingUpdate!.id;
		expect(instance.pendingUpdate).not.toBe(null);
		expect(instance.state.status).toBe("initial"); // skip pending
		instance.actions.run();
		let newTimeoutId = instance.pendingUpdate!.id;
		expect(newTimeoutId).not.toBe(timeoutId);
		expect(instance.state.status).toBe("initial"); // still skipping

		instance.actions.replaceState({
			data: 17,
			props: { args: [17] },
			timestamp: Date.now(),
			status: Status.success,
		});
		expect(instance.pendingUpdate).toBe(null);
	});
	it("should skip pending status", async () => {
		let instance = new AsyncState(
			"state-2",
			() => new Promise((res) => res(1)),
			{
				skipPendingStatus: true,
			}
		);
		instance.actions.run();
		expect(instance.state.status).toBe("initial");
		await flushPromises();
		expect(instance.state.status).toBe("success");
	});
	it("should replay the latest run", () => {
		let spy = jest.fn();
		let instance = new AsyncState("state-3", (props) => {
			spy(props.args[0]);
			return props.args[0];
		});
		instance.actions.replay();
		expect(spy).not.toHaveBeenCalled();
		instance.actions.run(12);
		let prevState = instance.state;
		expect(prevState.data).toBe(12);
		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy).toHaveBeenCalledWith(12);
		spy.mockClear();
		instance.actions.replay();
		expect(instance.state.data).toBe(12);
		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy).toHaveBeenCalledWith(12);
		expect(instance.state).not.toBe(prevState);
	});
	it("should run async generator", async () => {
		function* producer(props) {
			return yield new Promise((res) => setTimeout(res, 100));
		}

		let instance = new AsyncState("state-4", producer);
		instance.actions.run();
		await jest.advanceTimersByTime(99);
		expect(instance.state.status).toBe("pending");
		instance.actions.run();
		await jest.advanceTimersByTime(100);
		await flushPromises();
		expect(instance.state.status).toBe("success");
	});
	it("should run async generator and result in error with retry enabled", async () => {
		function* producer(props) {
			return yield new Promise((res, rej) => setTimeout(rej, 100));
		}

		let instance = new AsyncState("state-5", producer, {
			retryConfig: {
				enabled: true,
				maxAttempts: 2,
			},
		});
		instance.actions.run();
		await jest.advanceTimersByTime(100);
		await flushPromises();
		expect(instance.state.status).toBe("pending");
		await jest.advanceTimersByTime(100);
		await flushPromises();
		expect(instance.state.status).toBe("pending");
		await jest.advanceTimersByTime(100);
		await flushPromises();
		expect(instance.state.status).toBe("error");
	});
	it("should runc with effects", async () => {
		// never resolves
		let instance = new AsyncState(
			"state-6",
			() => new Promise((res) => setTimeout(res, 100)),
			{
				runEffectDurationMs: 100,
				runEffect: "debounce",
			}
		);
		instance.actions.run();
		expect(instance.state.status).toBe("initial");
		await jest.advanceTimersByTime(150);
		await flushPromises();
		expect(instance.state.status).toBe("pending");
		let abort = instance.actions.run();
		await jest.advanceTimersByTime(150);
		expect(instance.state.status).toBe("pending");
		abort!();
		await flushPromises();
		expect(instance.state.status).toBe("initial");
	});
});
