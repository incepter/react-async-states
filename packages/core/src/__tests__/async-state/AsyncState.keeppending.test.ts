import { AsyncState, Producer, ProducerConfig, Status } from "../..";
import { timeout } from "./test-utils";
import { expect } from "@jest/globals";

// @ts-ignore
jest.useFakeTimers("modern");
describe("AsyncState - keepPending", () => {
	it("should keep pending status in a normal way", async () => {
		// given
		let key = "keep-1";
		let producer = timeout(100);
		let myConfig: ProducerConfig<unknown, unknown, unknown, unknown[]> = {
			keepPendingForMs: 200,
		};

		// when
		let instance = new AsyncState(key, producer, myConfig);

		// then
		expect(instance.state.status).toBe(Status.initial);
		instance.actions.run();
		expect(instance.state.status).toBe(Status.pending);
		await jest.advanceTimersByTime(150); // producer resolves after 100
		expect(instance.state.status).toBe(Status.pending); // keepPending retains this
		await jest.advanceTimersByTime(50);
		expect(instance.state.status).toBe(Status.success);
	});
	it("should keep pending status and stack statuses updates", async () => {
		// given
		let key = "keep-2";
		let producer = timeout<number>(100, 0);
		let config: ProducerConfig<unknown, unknown, unknown, unknown[]> = {
			keepPendingForMs: 200,
		};

		// when
		let instance = new AsyncState(key, producer, config);

		// then
		instance.actions.run();
		await jest.advanceTimersByTime(50); // producer resolves after 100
		instance.actions.abort();
		expect(instance.state.status).toBe(Status.pending);

		await jest.advanceTimersByTime(150);
		expect(instance.state.status).toBe(Status.initial); // keepPending retains this

		// then
		instance.actions.run();
		await jest.advanceTimersByTime(50); // producer resolves after 100
		instance.actions.setState(1);
		expect(instance.state.status).toBe(Status.pending);

		await jest.advanceTimersByTime(150);
		expect(instance.state.data).toBe(1);

		// then
		instance.actions.run();
		await jest.advanceTimersByTime(50); // producer resolves after 100
		instance.actions.setState(2);
		instance.actions.setState((prev) => prev.data + 1);
		expect(instance.state.status).toBe(Status.pending);

		await jest.advanceTimersByTime(150);
		expect(instance.state.data).toBe(3);
	});
	it("should bailout pending update", async () => {
		// given
		let key = "keep-3";
		let producer = timeout<number>(100, 0);
		let config: ProducerConfig<unknown, unknown, unknown, unknown[]> = {
			keepPendingForMs: 200,
		};

		// when
		let spy = jest.fn();
		let instance = new AsyncState(key, producer, config);
		instance.actions.on("change", spy);

		// then
		instance.actions.run();
		await jest.advanceTimersByTime(50); // producer resolves after 100
		instance.actions.setState(2);
		instance.actions.run();
		instance.actions.setState(3);
		expect(instance.state.status).toBe(Status.pending);

		await jest.advanceTimersByTime(150);
		expect(instance.state.data).toBe(3);
		expect(instance.state.status).toBe(Status.success);

		let spyCalls = spy.mock.calls;
		expect(spyCalls.length).toBe(3);
		expect(spyCalls[0][0].status).toBe(Status.pending);
		expect(spyCalls[1][0].data).toBe(2);
		expect(spyCalls[2][0].status).toBe(Status.success);
	});
	it("should discard the update queue on dispose", async () => {
		// given
		let key = "keep-4";
		let producer = timeout<number>(100, 0);
		let config: ProducerConfig<unknown, unknown, unknown, unknown[]> = {
			keepPendingForMs: 200,
			initialValue: 1,
		};

		// when
		let instance = new AsyncState(key, producer, config);

		// then
		instance.actions.run();
		await jest.advanceTimersByTime(50); // producer resolves after 100
		instance.actions.dispose();

		await jest.advanceTimersByTime(150);
		expect(instance.state.data).toBe(1);
		expect(instance.state.status).toBe(Status.initial);
	});
	it("should work correctly with skipPendingStatus -- step into pending", async () => {
		// given
		let key = "keep-5";
		let producer = timeout<number>(300, 0);
		let config: ProducerConfig<unknown, unknown, unknown, unknown[]> = {
			keepPendingForMs: 600,
			initialValue: 1,
			skipPendingDelayMs: 250,
		};

		// when
		let instance = new AsyncState(key, producer, config);

		// then
		instance.actions.run();
		await jest.advanceTimersByTime(250); // producer resolves after 300
		expect(instance.state.status).toBe(Status.pending);
		await jest.advanceTimersByTime(200);
		expect(instance.state.status).toBe(Status.pending);

		await jest.advanceTimersByTime(400);
		expect(instance.state.status).toBe(Status.success);
	});
	it("should abort execute abort on sequenced runs", async () => {
		// given
		let key = "keep-6";
		let abortedSpy = jest.fn();
		let producer: Producer<unknown, unknown, unknown, unknown[]> = (props) => {
			props.onAbort(abortedSpy);
			return timeout<number>(300, 0)();
		};
		let config: ProducerConfig<unknown, unknown, unknown, unknown[]> = {
			initialValue: 1,
		};

		// when
		let instance = new AsyncState(key, producer, config);

		// then
		instance.actions.run();
		await jest.advanceTimersByTime(250); // producer resolves after 300
		expect(instance.state.status).toBe(Status.pending);
		instance.actions.run();
		expect(instance.state.status).toBe(Status.pending);
	});
	it("should work normally with run callbacks", async () => {
		// given
		let key = "keep-7";
		let onSuccess = jest.fn();
		let producer = timeout<number>(50, 0);
		let config: ProducerConfig<number, unknown, unknown, unknown[]> = {
			keepPendingForMs: 100,
			initialValue: 1,
		};

		// when
		let instance = new AsyncState(key, producer, config);

		// then
		instance.actions.runc({
			onSuccess,
		});
		await jest.advanceTimersByTime(60);

		expect(instance.state.status).toBe(Status.pending);
		expect(onSuccess).not.toHaveBeenCalled();
		await jest.advanceTimersByTime(40);
		expect(instance.state.status).toBe(Status.success);
		expect(onSuccess).toHaveBeenCalled();
	});
});
