import { createContext, getContext, terminateContext } from "../../pool";
import { expect } from "@jest/globals";


import {createSource} from "../../AsyncState";

describe("Create instances in different contexts", () => {
	let consoleErrorSpy;
	let originalConsoleError = console.error;
	beforeAll(() => {
		consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
	});
	afterAll(() => {
		console.error = originalConsoleError;
	});

	it("should reuse the same instance when no context is provided", () => {
		consoleErrorSpy.mockClear();
		let source1 = createSource("key1");
		let source2 = createSource("key1");
		expect(source1).toBe(source2);
		expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
	});

	it("should reuse the same instance in the same pool", () => {
		let ctx = {};
		createContext(ctx);
		let source1 = createSource("key2", null, { context: ctx });
		let source2 = createSource("key2", null, { context: ctx });
		expect(source1).toBe(source2);
	});
	it("should return the same context when creating with the same object", () => {
		let ctx = {};
		let context1 = createContext(ctx);
		let context2 = createContext(ctx);
		let context3 = createContext({});

		expect(context1).toBe(context2);
		expect(context1).not.toBe(context3);
	});
	it("should throw when a non object is passed (a part from null)", () => {
		expect(() => createContext("string")).toThrow(
			"createContext requires an object"
		);
		expect(() => createContext(Symbol("ok"))).toThrow(
			"createContext requires an object"
		);
		expect(() => createContext(15)).toThrow("createContext requires an object");
		expect(() => createContext(undefined)).toThrow(
			"createContext requires an object"
		);

		// should not throw when null is passed (default context)
		expect(() => createContext(null)).not.toThrow(
			"createContext requires an object"
		);
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
	it("should throw when context isnt created first", () => {
		let ctx1 = {};
		expect(() => createSource("key4", null, { context: ctx1 })).toThrow(
			"No execution context for context [object Object]"
		);
	});
	it("should throw when context is already terminated", () => {
		let ctx = {};

		createContext(ctx);
		expect(() => createSource("key5", null, { context: ctx })).not.toThrow(
			"No execution context for context [object Object]"
		);

		terminateContext(ctx);
		expect(() => createSource("key6", null, { context: ctx })).toThrow(
			"No execution context for context [object Object]"
		);

		// this should do nothing: terminate a non existing context
		terminateContext(undefined);
	});

	it("getContext should return the actual context", () => {
		let ctx = {};
		let context = createContext(ctx);
		let defaultContext = getContext(null);
		expect(getContext(ctx)).toBe(context);
		expect(defaultContext).not.toBe(context);
	});
});
