import { createSource } from "../../AsyncState";
import { createContext } from "../../modules/StateContext";

describe("Create instances in different contexts", () => {
	it("should reuse the same instance when no context is provided", () => {
		let source1 = createSource("key1");
		let source2 = createSource("key1");
		let source3 = createSource("another1");
		expect(source1).toBe(source2);
		expect(source1).not.toBe(source3);
		expect(source2).not.toBe(source3);
	});

	it("should reuse the same instance in the same context", () => {
		let ctx = {};
		createContext(ctx);
		let source1 = createSource("key2", null, { context: ctx });
		let source2 = createSource("key2", null, { context: ctx });
		expect(source1).toBe(source2);
	});

	it("should use a different instance from different pools", () => {
		let ctx1 = {};
		let ctx2 = {};
		createContext(ctx1);
		createContext(ctx2);
		let source1 = createSource("key3", null, { context: ctx1 });
		let source2 = createSource("key3", null, { context: ctx2 });
		expect(source1).not.toBe(source2);
	});
});
