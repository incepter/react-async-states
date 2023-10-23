import { AsyncState, ProducerConfig, Status } from "../..";
import { timeout } from "./test-utils";
import { expect } from "@jest/globals";
import { flushPromises } from "../utils/test-utils";

// @ts-ignore
jest.useFakeTimers("modern");
describe("AsyncState - retry", () => {
	it("should retry synchronous work", async () => {
		// given
		let key = "retry-1";
		let spy = jest.fn();
		let retry = jest.fn().mockImplementation(() => true);
		let config: ProducerConfig<number, unknown, unknown, unknown[]> = {
			retryConfig: {
				retry,
				enabled: true,
				maxAttempts: 2,
			},
		};
		function producer(): number {
			throw 15;
		}

		// when
		let instance = new AsyncState(key, producer, config);
		instance.on("change", { status: Status.error, handler: spy });

		// then
		instance.run();
		await jest.advanceTimersByTime(1);
		await flushPromises();

		expect(instance.state.status).toBe(Status.error);
		expect(instance.state.data).toBe(15);

		expect(retry).toHaveBeenCalledTimes(3); // third time it be > maxRetries
		expect(retry.mock.calls[0][0]).toBe(1);
		expect(retry.mock.calls[1][0]).toBe(2);
		expect(retry.mock.calls[2][0]).toBe(3);

		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy.mock.calls[0][0].data).toBe(15);
	});
	it("should retry asynchronous work", async () => {
		// given
		let key = "retry-2";
		let didErrorCount = 0;
		let maxErrorCount = 3;
		let producer = function producer() {
			return timeout<number>(50, 0)().then((value) => {
				if (didErrorCount === maxErrorCount) {
					return value;
				}
				didErrorCount += 1;
				throw 5;
			});
		};
		let retry = jest.fn().mockImplementation(() => true);
		let config: ProducerConfig<number, unknown, unknown, unknown[]> = {
			retryConfig: {
				retry,
				enabled: true,
				maxAttempts: 4,
				backoff: () => 10,
			},
		};

		// when
		let instance = new AsyncState(key, producer, config);

		// then
		instance.run();
		await jest.advanceTimersByTime(50);
		await flushPromises();

		expect(instance.state.status).toBe(Status.pending);
		expect(retry).toHaveBeenCalledTimes(1);
		expect(retry.mock.calls[0][0]).toBe(1);
		expect(retry.mock.calls[0][1]).toBe(5); // error thrown

		await jest.advanceTimersByTime(60); // backoff = 10 + 50 of timeout producer
		await flushPromises();

		expect(instance.state.status).toBe(Status.pending);
		expect(retry).toHaveBeenCalledTimes(2);
		expect(retry.mock.calls[1][0]).toBe(2);
		expect(retry.mock.calls[1][1]).toBe(5); // error thrown

		await jest.advanceTimersByTime(60); // backoff = 10 + 50 of timeout producer
		await flushPromises();

		expect(instance.state.status).toBe(Status.pending);
		expect(retry).toHaveBeenCalledTimes(3);
		expect(retry.mock.calls[2][0]).toBe(3);
		expect(retry.mock.calls[2][1]).toBe(5); // error thrown

		await jest.advanceTimersByTime(60); // backoff = 10 + 50 of timeout producer
		await flushPromises();

		retry.mockClear();
		expect(instance.state.data).toBe(0);
		expect(instance.state.status).toBe(Status.success);
		expect(retry).not.toHaveBeenCalled();
	});
});
