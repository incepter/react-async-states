import * as React from "react";
import { act, render, screen } from "@testing-library/react";
import { useAsync } from "../../hooks/useAsync_export";
import {
	createContext,
	createSource,
	requestContext,
	Source,
} from "async-states";

describe("storing instance in context", () => {
	it("should not store the instance in context", async () => {
		// given
		let ctx = {}

		let _key: string = "";
		let _source: Source<number, any, any> | undefined = undefined;
		function Component() {
			let { source, data } = useAsync<number>({
				context: ctx,
			});

			_source = source;
			_key = source.key;
			return <span data-testid="result">{data}</span>;
		}

		// when
		render(
			<React.StrictMode>
				<Component />
			</React.StrictMode>
		);

		// then
		expect(_key).not.toBe("");
		expect(_source).not.toBe(undefined);
		expect(_source!.inst.ctx).toBe(null);

		let sourceFromContext = createSource(_key, null, { context: ctx });
		expect(sourceFromContext).not.toBe(_source);
	});
	it("should store the instance in context", async () => {
		// given
		let context = requestContext(null);

		let _key: string = "toto";
		let _source: Source<number, any, any> | undefined = undefined;
		function Component() {
			let { source, data } = useAsync<number>({
				key: _key,
			});

			_source = source;
			_key = source.key;
			return <span data-testid="result">{data}</span>;
		}

		// when
		render(
			<React.StrictMode>
				<Component />
			</React.StrictMode>
		);

		// then
		expect(_source).not.toBe(undefined);

		let sourceFromContext = createSource(_key);
		expect(sourceFromContext.inst.ctx).toBe(_source!.inst.ctx);

		expect(sourceFromContext).toBe(_source);
	});
});
