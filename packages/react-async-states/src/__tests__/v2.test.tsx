import * as React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { createBoundSource, createSource } from "../v2/source";
import { expect } from "@jest/globals";

let index = 0;
function getKey() {
	return `test-${++index}`;
}

describe("v2 drafts", () => {
	it("should run in global scope by bound source", async () => {
		const spy = jest.fn();
		const testKey = getKey();
		const unboundSource = createSource(testKey, spy);

		expect(unboundSource.src).toBe(null);
		unboundSource.run(1);
		expect(spy).toHaveBeenCalledTimes(1);
		expect(unboundSource.src).not.toBe(null);
		expect(unboundSource.src).not.toBe(unboundSource);
		expect(unboundSource.src).toBe(createBoundSource(testKey, spy));
	});
	it("should create stable bound source", async () => {
		const spy = jest.fn();
		const anotherSpy = jest.fn();
		const testKey = getKey();
		const unboundSource = createSource(testKey, spy);
		const boundSource = createBoundSource(testKey, spy);
		const sameBoundSource = createBoundSource(testKey, anotherSpy);

		boundSource.run(1);
		expect(spy).toHaveBeenCalledTimes(1);

		expect(boundSource).toBe(sameBoundSource);
		expect(unboundSource).not.toBe(boundSource);
		expect(unboundSource).not.toBe(sameBoundSource);
	});
	it("should bind to contexts and perform stable references", async () => {
		const spy = jest.fn();
		const testContext1 = {};
		const testContext2 = {};
		const testKey = getKey();

		const unboundSource = createSource(testKey);

		const boundToContext1 = unboundSource.bind(testContext1);
		const boundSourceFromContext1 = createBoundSource(testKey, undefined, {
			context: testContext1,
		});

		expect(boundToContext1).toBe(boundSourceFromContext1);

		const boundSourceFromContext2 = createBoundSource(testKey, spy, {
			context: testContext2,
		});
		const boundToContext2 = unboundSource.bind(testContext2);
		expect(boundToContext2).toBe(boundSourceFromContext2);

		expect(boundToContext1).not.toBe(boundToContext2);

		expect(unboundSource.src).toBe(null);
	});
});
