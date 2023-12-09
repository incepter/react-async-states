import * as React from "react";
import { render } from "@testing-library/react";
import { useAsync } from "../../hooks/useAsync_export";
import { createSource } from "async-states";

describe("warning when no state is used", () => {
	it("should warn in dev when no state is used", () => {
		// given
		let originalConsoleError = console.error;
		let consoleErrorSpy = jest.fn();
		console.error = consoleErrorSpy;

		let source = createSource("blank", null);
		function Test() {
			let {
				source: { run },
			} = useAsync(source);
			return null;
		}

		// when
		render(
			<React.StrictMode>
				<Test />
			</React.StrictMode>
		);

		let errorWarning = consoleErrorSpy.mock.calls[0][0];
		expect(
			errorWarning.includes(
				"[Warning] - useAsyncStates called in Test without using the state, lastSuccess or read properties"
			)
		).toBeTruthy();

		console.error = originalConsoleError;
	});
	it("should not warn in dev when state is used", () => {
		// given
		let originalConsoleError = console.error;
		let consoleErrorSpy = jest.fn();
		console.error = consoleErrorSpy;

		let source = createSource("blank", null);
		function Test() {
			let { state } = useAsync(source);
			return null;
		}

		// when
		render(
			<React.StrictMode>
				<Test />
			</React.StrictMode>
		);

		expect(consoleErrorSpy).not.toHaveBeenCalled();

		console.error = originalConsoleError;
	});
	it("should not warn in dev when lastSuccess is used", () => {
		// given
		let originalConsoleError = console.error;
		let consoleErrorSpy = jest.fn();
		console.error = consoleErrorSpy;

		let source = createSource("blank", null);
		function Test() {
			let { lastSuccess } = useAsync(source);
			return null;
		}

		// when
		render(
			<React.StrictMode>
				<Test />
			</React.StrictMode>
		);

		expect(consoleErrorSpy).not.toHaveBeenCalled();

		console.error = originalConsoleError;
	});
	it("should not warn in dev when read is used", () => {
		// given
		let originalConsoleError = console.error;
		let consoleErrorSpy = jest.fn();
		console.error = consoleErrorSpy;

		let source = createSource("blank", null);
		function Test() {
			let { read } = useAsync(source);
			return null;
		}

		// when
		render(
			<React.StrictMode>
				<Test />
			</React.StrictMode>
		);

		expect(consoleErrorSpy).not.toHaveBeenCalled();

		console.error = originalConsoleError;
	});
});
