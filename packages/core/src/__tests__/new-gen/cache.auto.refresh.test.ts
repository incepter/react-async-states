import { createSource } from "../../AsyncState";
import { expect, jest } from "@jest/globals";
import { ProducerProps } from "../../types";

// @ts-ignore
jest.useFakeTimers("modern");
describe("AsyncState cache auto refresh", () => {
	it("should not refresh cache automatically", async () => {
		let spy = jest.fn();
		function producer({ args }: ProducerProps<number, [number]>) {
			spy.apply(null, args);
			return args[0];
		}
		let source = createSource("test-1", producer, {
			cacheConfig: {
				enabled: true,
				timeout: () => 50, // 50 ms
			},
		});
		source.run(1); // -> state is now 1
		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy).toHaveBeenCalledWith(1);
		spy.mockClear();
		source.run(1); // -> state is now 1
		expect(spy).toHaveBeenCalledTimes(0); // consumed from cache without running
		spy.mockClear();

		// deadline is 50, should be > 50
		jest.advanceTimersByTime(51);
		source.run(1); // -> state is now 1
		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy).toHaveBeenCalledWith(1);
		spy.mockClear();
	});
	it("should refresh cache automatically", async () => {
		let spy = jest.fn();
		function producer({ args }: ProducerProps<number, [number]>) {
			spy.apply(null, args);
			return args[0];
		}
		let source = createSource("test-2", producer, {
			cacheConfig: {
				auto: true,
				enabled: true,
				timeout: 50, // 50 ms
			},
		});

		source.run(1); // -> state is now 1
		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy).toHaveBeenCalledWith(1);
		spy.mockClear();
		source.run(1); // -> state is now 1
		expect(spy).toHaveBeenCalledTimes(0); // consumed from cache without running
		spy.mockClear();

		// cache won't be refreshed if there are no subscribers
		let unsubscribe = source.subscribe(() => {});

		// deadline is 50, should be > 50
		jest.advanceTimersByTime(51);
		// now the run should have been triggerred automatically
		expect(spy).toHaveBeenCalledTimes(1);
		expect(spy).toHaveBeenCalledWith(1);
		spy.mockClear();
		unsubscribe!();

		source.run(1);
		expect(spy).toHaveBeenCalledTimes(0);
		spy.mockClear();

		jest.advanceTimersByTime(51);
		// no auto call will be performed since there are no subscribers
		expect(spy).toHaveBeenCalledTimes(0);

		// there was only one entry in the cache, verify it was removed
		expect(source.inst.cache).toEqual({});
	});
	it("should warn about deprecated getDeadline", async () => {
		let consoleErrorSpy = jest.fn();
		let originalConsoleError = console.error;

		console.error = consoleErrorSpy;

		createSource("test-3", null, {
			cacheConfig: {
				enabled: true,
				// @ts-expect-error: getDeadline is removed, testing the warning here
				getDeadline: () => 50,
			},
		});

		expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			"[Warning][async state] getDeadline is deprecated infavor of 'timeout' " +
			"with the same signature, and supports now numbers. state with key test-3 " +
			"has a cacheConfig.getDeadline configured"
		);

		console.error = originalConsoleError;
	});
});
