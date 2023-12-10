import * as React from "react";
import { render, screen } from "@testing-library/react";
import { useAsync } from "../../hooks/useAsync_export";
import { createSource, Status } from "async-states";

describe("useAsync().data", () => {
	it("should give initial data when defined", async () => {
		let source = createSource("test-1", null, { initialValue: 5 });
		// given
		function Component() {
			const {
				data,
				state: { status },
			} = useAsync(source);
			return (
				<div>
					<span data-testid="result">
						{status}-{data}
					</span>
				</div>
			);
		}
		render(
			<React.StrictMode>
				<Component />
			</React.StrictMode>
		);

		expect(screen.getByTestId("result").innerHTML).toEqual("initial-5");
	});
	it("should give null initial data", async () => {
		let source = createSource("test-2");
		// given
		function Component() {
			const {
				data,
				state: { status },
			} = useAsync(source);
			return (
				<div>
					<span data-testid="result">
						{status}-{String(data)}
					</span>
				</div>
			);
		}
		render(
			<React.StrictMode>
				<Component />
			</React.StrictMode>
		);

		expect(screen.getByTestId("result").innerHTML).toEqual("initial-null");
	});
	it("should give data with success status", async () => {
		let source = createSource("test-3", null, { initialValue: 5 });
		source.setState(6);
		// given
		function Component() {
			const {
				data,
				state: { status },
			} = useAsync(source);
			return (
				<div>
					<span data-testid="result">
						{status}-{data}
					</span>
				</div>
			);
		}
		render(
			<React.StrictMode>
				<Component />
			</React.StrictMode>
		);

		expect(screen.getByTestId("result").innerHTML).toEqual("success-6");
	});
	it("should give data with pending status", async () => {
		let source = createSource("test-4", null, { initialValue: 5 });
		// 6 will be ignored for pending state (state.data is null when pending)
		// useAsync.data is lastSuccess.data
		source.setState(6, Status.pending);
		// given
		function Component() {
			const {
				data,
				state: { status },
			} = useAsync(source);
			return (
				<div>
					<span data-testid="result">
						{status}-{data}
					</span>
				</div>
			);
		}
		render(
			<React.StrictMode>
				<Component />
			</React.StrictMode>
		);

		expect(screen.getByTestId("result").innerHTML).toEqual("pending-5");
	});
	it("should give data with error status", async () => {
		let source = createSource("test-5", null, { initialValue: 5 });
		source.setState(7, Status.error);
		// given
		function Component() {
			const {
				data,
				state: { status },
			} = useAsync(source);
			return (
				<div>
					<span data-testid="result">
						{status}-{data}
					</span>
				</div>
			);
		}
		render(
			<React.StrictMode>
				<Component />
			</React.StrictMode>
		);

		expect(screen.getByTestId("result").innerHTML).toEqual("error-5");
	});
});
