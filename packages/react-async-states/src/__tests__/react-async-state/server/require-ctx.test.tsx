import * as React from "react";
import { render } from "@testing-library/react";
import { mockDateNow } from "../../utils/setup";
import Provider from "../../../provider/Provider";
import AsyncStateComponent from "../../utils/AsyncStateComponent";
import { createContext, createSource } from "async-states";

mockDateNow();
jest.mock("../../../Provider/context", () => {
	return {
		...jest.requireActual("../../../Provider/context"),
		isServer: true,
	};
});

describe("context in the server", () => {
	it("should throw when no parent provider present", async () => {
		let originalConsoleError = console.error;
		console.error = jest.fn();

		// given
		function Test() {
			return (
				<div data-testid="parent">
					<AsyncStateComponent config={{ key: "key-1" }} />
				</div>
			);
		}

		// when
		expect(() => {
			render(
				<React.StrictMode>
					<Test />
				</React.StrictMode>
			);
		}).toThrow("A context object is mandatory when working in the server");

		console.error = originalConsoleError;
	});
	it("should not throw when parent provider present", async () => {
		let originalConsoleError = console.error;
		console.error = jest.fn();

		// given
		function Test() {
			return (
				<div data-testid="parent">
					<Provider id="test">
						<AsyncStateComponent config={{ key: "key-2" }} />
					</Provider>
				</div>
			);
		}

		// when
		expect(() => {
			render(
				<React.StrictMode>
					<Test />
				</React.StrictMode>
			);
		}).not.toThrow("A context object is mandatory when working in the server");

		console.error = originalConsoleError;
	});
	it("should not throw when no parent provider present but context is given", async () => {
		let originalConsoleError = console.error;
		console.error = jest.fn();

		let ctx = {};
		// given
		function Test() {
			return (
				<div data-testid="parent">
					<AsyncStateComponent config={{ key: "key-3", context: ctx }} />
				</div>
			);
		}

		// when
		expect(() => {
			render(
				<React.StrictMode>
					<Test />
				</React.StrictMode>
			);
		}).not.toThrow("A context object is mandatory when working in the server");

		console.error = originalConsoleError;
	});
	it("should throw on leaked source between contexts", async () => {
		let originalConsoleError = console.error;
		console.error = jest.fn();

		let ctx = {};
		let ctx2 = {};
		createContext(ctx);
		createContext(ctx2);
		let src = createSource("src-1");
		// given
		function Test() {
			return (
				<div data-testid="parent">
					<Provider id="test-test" context={ctx2}>
						<AsyncStateComponent config={src} />
					</Provider>
				</div>
			);
		}

		// when
		expect(() => {
			render(
				<React.StrictMode>
					<Test />
				</React.StrictMode>
			);
		}).toThrow("Source src-1 is leaking between contexts");

		console.error = originalConsoleError;
	});
	it("should throw when no key is provided in the server", async () => {
		let originalConsoleError = console.error;
		console.error = jest.fn();

		// given
		function Test() {
			return (
				<div data-testid="parent">
					<Provider id="test-test">
						<AsyncStateComponent config={{}} />
					</Provider>
				</div>
			);
		}

		// when
		expect(() => {
			render(
				<React.StrictMode>
					<Test />
				</React.StrictMode>
			);
		}).toThrow("A key is required in the server to avoid hydration issues.");

		console.error = originalConsoleError;
	});
});
