import { resolveFlags, resolveInstance } from "../../state-hook/StateHook";
import { createContext, createSource, readSource } from "async-states";

describe("StateHook resolveInstance", () => {
	it("should return null when waiting for the instance", () => {
		let config = { key: "key", wait: true };
		let usedPool = createContext({}).getOrCreatePool();

		let instance = resolveInstance(
			usedPool,
			resolveFlags(config, usedPool),
			config
		);
		expect(instance).toBe(null);
	});
	it("should correctly resolve instance from source configuration", () => {
		let src = createSource("key1");
		let usedPool = createContext({}).getOrCreatePool();
		let config = src;

		let instance = resolveInstance(
			usedPool,
			resolveFlags(config, usedPool),
			config
		);
		expect(instance!.key).toBe("key1");
		expect(instance!.actions).toBe(src);
	});
	it("should correctly resolve instance from source property configuration", () => {
		let src = createSource("key2");
		let usedPool = createContext({}).getOrCreatePool();
		let config = { source: src };

		let instance = resolveInstance(
			usedPool,
			resolveFlags(config, usedPool),
			config
		);
		expect(instance!.key).toBe("key2");
		expect(instance!.actions).toBe(src);
	});
	it("should correctly resolve instance from lane source", () => {
		let src = createSource("key4");
		let lane = src.getLane("lane");
		let usedPool = createContext({}).getOrCreatePool();
		let config = { source: src, lane: "lane" };

		let instance = resolveInstance(
			usedPool,
			resolveFlags(config, usedPool),
			config
		);
		expect(instance!.key).toBe("lane");
		expect(instance!.actions).toBe(lane);
		expect(instance!.actions).not.toBe(src);
	});
	it("should correctly resolve standalone instance when not existing", () => {
		let usedPool = createContext({}).getOrCreatePool();
		let config = { key: "standalone1" };

		let instance = resolveInstance(
			usedPool,
			resolveFlags(config, usedPool),
			config
		);
		expect(instance!.key).toBe("standalone1");
	});
	it("should correctly resolve standalone instance when not existing and take a lane", () => {
		let usedPool = createContext({}).getOrCreatePool();
		let config = { key: "standalone1", lane: "std-lane" };

		let instance = resolveInstance(
			usedPool,
			resolveFlags(config, usedPool),
			config
		);
		expect(instance!.key).toBe("std-lane");
	});
	it("should correctly resolve standalone instance when already existing in pool", () => {
		let src = createSource("newOne");
		let usedPool = createContext({}).getOrCreatePool();
		usedPool.set(src.key, readSource(src));

		let config = { key: "newOne" };

		let instance = resolveInstance(
			usedPool,
			resolveFlags(config, usedPool),
			config
		);
		expect(instance!.key).toBe("newOne");
		expect(instance!.actions).toBe(src);
	});
	it("should correctly resolve standalone instance when already existing in pool by lane", () => {
		let src = createSource("newOne2");
		let usedPool = createContext({}).getOrCreatePool();
		usedPool.set(src.key, readSource(src));

		let config = { key: "newOne2", lane: "some-lane" };

		let instance = resolveInstance(
			usedPool,
			resolveFlags(config, usedPool),
			config
		);
		expect(instance!.key).toBe("some-lane");
		expect(instance!.actions).toBe(src.getLane("some-lane"));
	});
	it("should correctly resolve standalone instance when already existing and patch producer", () => {
		let src = createSource("newOne3");
		let usedPool = createContext({}).getOrCreatePool();
		let inst = readSource(src);
		usedPool.set(src.key, inst);

		let config = { key: "newOne3", producer: () => {} };

		expect(inst!.fn).not.toBe(config.producer);
		let instance = resolveInstance(
			usedPool,
			resolveFlags(config, usedPool),
			config
		);
		expect(instance!.key).toBe("newOne3");
		expect(instance!.fn).toBe(config.producer);
	});
});
