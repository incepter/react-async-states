import { maybeWindow } from "../../utils";
import { AsyncState, createSource, Sources } from "../../AsyncState";
import { mockDateNow } from "../utils/setup";
import { Status } from "../../enums";
import { expect } from "@jest/globals";

mockDateNow();
describe("AsyncState instance creation", () => {
	function bootHydration(data) {
		eval(data);
	}

	it("should boot instance state from hydrated content", () => {
		if (!maybeWindow) {
			throw new Error("No globalThis");
		}
		bootHydration(
			'window.__ASYNC_STATES_HYDRATION_DATA__ = Object.assign(window.__ASYNC_STATES_HYDRATION_DATA__ || {}, {"ASYNC-STATES-default-POOL__INSTANCE__state-1":{"state":{"status":"success","data":42,"props":{"args":[42],"payload":{}},"timestamp":1487076708000},"payload":{}}})'
		);
		let instance = new AsyncState("state-1", null);
		expect(instance._source.getVersion()).toBe(0);
		expect(instance._source.getState().data).toBe(42);
		expect(instance._source.getState().status).toBe("success");
		expect(instance.lastSuccess).toBe(instance._source.getState());
		bootHydration(
			'window.__ASYNC_STATES_HYDRATION_DATA__ = Object.assign(window.__ASYNC_STATES_HYDRATION_DATA__ || {}, {"ASYNC-STATES-default-POOL__INSTANCE__state-2":{"state":{"status":"error","data":42,"props":{"args":[42],"payload":{}},"timestamp":1487076708000},"payload":{}}})'
		);
		let instance2 = new AsyncState("state-2", null, { initialValue: 15 });
		expect(instance2._source.getState().data).toBe(42);
		expect(instance2._source.getState().status).toBe("error");
		expect(instance2.lastSuccess.data).toBe(15);
		expect(instance2.lastSuccess.status).toBe("initial");
	});
	it("should initialize state from cache and invalidate it", () => {
		let persistSpy = jest.fn();
		let instance = new AsyncState("state-3", (props) => props.args[0], {
			initialValue(cache) {
				return cache?.stateHash.state.data;
			},
			cacheConfig: {
				enabled: true,
				load() {
					return {
						stateHash: {
							addedAt: Date.now(),
							deadline: Date.now() + 1000,
							state: {
								timestamp: Date.now(),
								status: Status.success,
								data: 55,
								props: { args: [55] },
							},
						},
						stateHash2: {
							addedAt: Date.now(),
							deadline: Date.now() + 1000,
							state: {
								timestamp: Date.now(),
								status: Status.success,
								data: 66,
								props: { args: [66] },
							},
						},
					};
				},
				persist() {
					persistSpy.apply(null, arguments);
				},
			},
		});

		expect(instance._source.getState().status).toBe("initial");
		expect(instance._source.getState().data).toBe(55);

		let prevCache1 = instance.cache!.stateHash;

		instance._source.replaceCache("stateHash", { ...prevCache1 });
		expect(instance.cache!.stateHash).not.toBe(prevCache1);

		persistSpy.mockClear();
		expect(instance.cache!.stateHash).not.toBe(undefined);
		expect(instance.cache!.stateHash2).not.toBe(undefined);
		instance._source.invalidateCache("stateHash");
		expect(persistSpy).toHaveBeenCalledTimes(1);
		expect(instance.cache!.stateHash).toBe(undefined);
		expect(instance.cache!.stateHash2).not.toBe(undefined);

		persistSpy.mockClear();
		instance._source.invalidateCache();
		expect(persistSpy).toHaveBeenCalledTimes(1);
		expect(instance.cache!.stateHash).toBe(undefined);
		expect(instance.cache!.stateHash2).toBe(undefined);
	});

	it("should update given configuration", () => {
		let instance = new AsyncState("state-4", null, { initialValue: 15 });
		expect(instance._source.getConfig().initialValue).toBe(15);
		instance._source.patchConfig({ initialValue: 16 });
		expect(instance._source.getConfig().initialValue).toBe(16);
	});
	it("should answer correctly for hasLane and delete lane", () => {
		let instance = new AsyncState("state-5", null);
		// expect(instance._source.removeLane()).toBe(false);
		// expect(instance._source.hasLane("notfound")).toBe(false);
		instance._source.getLane("toBeForgotten");
		expect(instance._source.hasLane("toBeForgotten")).toBe(true);

		expect(instance._source.removeLane("toBeForgotten")).toBe(true);
		expect(instance._source.hasLane("toBeForgotten")).toBe(false);
	});
	it("should return main instance on getLane", () => {
		let instance = new AsyncState("state-6", null);
		expect(instance._source.getLane()).toBe(instance._source);
	});
	it("should throw when attempting to force a non existing status", () => {
		let instance = new AsyncState("state-7", null, { initialValue: 1 });
		// @ts-ignore
		expect(() => instance._source.setState(15, "unknown")).toThrow(
			"Unknown status ('unknown')"
		);
	});
	it("should return all lanes", () => {
		let instance = new AsyncState("state-8", null);
		expect(instance._source.getAllLanes()).toEqual([]);
		let secondSrc = instance._source.getLane("toForget");
		expect(instance._source.getAllLanes()).toEqual([secondSrc]);
	});
	it("should get source by all ways", () => {
		let src = createSource({ key: "state-9" });
		expect(src.key).toEqual("state-9");
		expect(Sources.of("state-9")).toBe(src);

		let prevConsoleError = console.error;
		console.error = () => {}; // shut warning
		// @ts-ignore
		expect(Sources("state-9")).toBe(src);
		expect(Sources.for("state-9")).toBe(src);
		console.error = prevConsoleError;
	});
});
