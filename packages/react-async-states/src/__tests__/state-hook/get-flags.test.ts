import {
	AUTO_RUN,
	CHANGE_EVENTS,
	CONCURRENT,
	CONFIG_FUNCTION,
	CONFIG_OBJECT,
	CONFIG_SOURCE,
	CONFIG_STRING,
	LANE,
	SOURCE,
	SUBSCRIBE_EVENTS,
} from "../../state-hook/StateHookFlags";
import { resolveFlags } from "../../state-hook/StateHook";
import { createSource, requestContext } from "async-states";

describe("resolveFlags", () => {
	let execContext = requestContext(null);
	describe("get flags from config outside provider", () => {
		it("should correctly infer configuration from key: -- string --", () => {
			expect(resolveFlags("key")).toEqual(CONFIG_STRING);

			expect(
				resolveFlags("key", {
					lazy: false,
				})
			).toEqual(CONFIG_STRING | AUTO_RUN);

			expect(resolveFlags("key", { lane: "lane" })).toEqual(
				CONFIG_STRING | LANE
			);

			expect(resolveFlags("key", { concurrent: true })).toEqual(
				CONFIG_STRING | CONCURRENT
			);
		});
		it("should correctly infer configuration from key: -- object with key --", () => {
			let key = "key";

			expect(resolveFlags({ key })).toEqual(CONFIG_OBJECT);

			expect(resolveFlags({ key, lazy: false })).toEqual(
				CONFIG_OBJECT | AUTO_RUN
			);

			expect(resolveFlags({ key, concurrent: true })).toEqual(
				CONFIG_OBJECT | CONCURRENT
			);

			expect(resolveFlags({ key, lane: "lane" })).toEqual(CONFIG_OBJECT | LANE);

			expect(resolveFlags({ key, producer: () => 5 }, { lazy: false })).toEqual(
				CONFIG_OBJECT | AUTO_RUN
			);
		});
		it("should correctly infer configuration from source: -- source --", () => {
			let source = createSource("tmp");

			expect(resolveFlags(source)).toEqual(CONFIG_SOURCE | SOURCE);

			expect(resolveFlags(source, { lazy: false })).toEqual(
				CONFIG_SOURCE | SOURCE | AUTO_RUN
			);

			expect(resolveFlags(source, { lane: "lane" })).toEqual(
				CONFIG_SOURCE | SOURCE | LANE
			);

			expect(resolveFlags(source, { producer: () => 5, lazy: false })).toEqual(
				CONFIG_SOURCE | SOURCE | AUTO_RUN
			);
		});
		it("should correctly infer configuration from source: -- object with source --", () => {
			let source = createSource("tmp2");

			expect(resolveFlags({ source })).toEqual(CONFIG_OBJECT | SOURCE);

			expect(resolveFlags({ source }, { lazy: false })).toEqual(
				CONFIG_OBJECT | SOURCE | AUTO_RUN
			);

			expect(resolveFlags({ source }, { lane: "lane" })).toEqual(
				CONFIG_OBJECT | SOURCE | LANE
			);

			expect(resolveFlags({ source, producer: () => 5, lazy: false })).toEqual(
				CONFIG_OBJECT | SOURCE | AUTO_RUN
			);
		});
		it("should correctly infer configuration from producer: -- producer --", () => {
			let producer = () => 5;

			expect(resolveFlags(producer)).toEqual(CONFIG_FUNCTION);

			expect(resolveFlags(producer, { lazy: false })).toEqual(
				CONFIG_FUNCTION | AUTO_RUN
			);

			expect(resolveFlags(producer, { lane: "lane" })).toEqual(
				CONFIG_FUNCTION | LANE
			);
		});
		it("should correctly infer configuration from producer: -- object with producer --", () => {
			let producer = () => 5;

			expect(resolveFlags({ producer })).toEqual(CONFIG_OBJECT);

			expect(resolveFlags({ producer }, { lazy: false })).toEqual(
				CONFIG_OBJECT | AUTO_RUN
			);

			expect(resolveFlags({ producer }, { lane: "lane" })).toEqual(
				CONFIG_OBJECT | LANE
			);
		});
		it("should correctly infer configuration from object: -- remaining cases  --", () => {
			expect(
				resolveFlags({
					key: "test",
					payload: {},
					lazy: false,
					producer: () => 5,
				})
			).toEqual(CONFIG_OBJECT | AUTO_RUN);
		});
	});

	describe("get flags from config inside provider", () => {
		it("should correctly infer configuration from key: -- string --", () => {
			expect(resolveFlags("key")).toEqual(CONFIG_STRING);

			expect(resolveFlags("not-existing")).toEqual(
				CONFIG_STRING
			);

			expect(
				resolveFlags("key", {
					lazy: false,
				})
			).toEqual(CONFIG_STRING | AUTO_RUN);

			expect(resolveFlags("key", { lane: "lane" })).toEqual(
				CONFIG_STRING | LANE
			);
		});
		it("should correctly infer configuration from key: -- object with key --", () => {
			let key = "key";

			expect(resolveFlags({ key })).toEqual(CONFIG_OBJECT);
			expect(
				resolveFlags({ key: "not-existing", lazy: false })
			).toEqual(CONFIG_OBJECT | AUTO_RUN);

			expect(resolveFlags({ key, lazy: false })).toEqual(
				CONFIG_OBJECT | AUTO_RUN
			);

			expect(resolveFlags({ key, lane: "lane" })).toEqual(CONFIG_OBJECT | LANE);

			expect(resolveFlags({ key, producer: () => 5 }, { lazy: false })).toEqual(
				CONFIG_OBJECT | AUTO_RUN
			);
		});
		it("should correctly infer configuration from source: -- source --", () => {
			let source = createSource("tmp3");

			expect(resolveFlags(source)).toEqual(CONFIG_SOURCE | SOURCE);

			expect(resolveFlags(source, { lazy: false })).toEqual(
				CONFIG_SOURCE | SOURCE | AUTO_RUN
			);

			expect(resolveFlags(source, { lane: "lane" })).toEqual(
				CONFIG_SOURCE | SOURCE | LANE
			);

			expect(resolveFlags(source, { producer: () => 5, lazy: false })).toEqual(
				CONFIG_SOURCE | SOURCE | AUTO_RUN
			);
		});
		it("should correctly infer configuration from source: -- object with source --", () => {
			let source = createSource("tmp4");

			expect(resolveFlags({ source })).toEqual(CONFIG_OBJECT | SOURCE);

			expect(resolveFlags({ source }, { lazy: false })).toEqual(
				CONFIG_OBJECT | SOURCE | AUTO_RUN
			);

			expect(resolveFlags({ source }, { lane: "lane" })).toEqual(
				CONFIG_OBJECT | SOURCE | LANE
			);

			expect(resolveFlags({ source, producer: () => 5, lazy: false })).toEqual(
				CONFIG_OBJECT | SOURCE | AUTO_RUN
			);
		});
		it("should correctly infer configuration from producer: -- producer --", () => {
			let producer = () => 5;

			expect(resolveFlags(producer)).toEqual(CONFIG_FUNCTION);

			expect(resolveFlags(producer, { lazy: false })).toEqual(
				CONFIG_FUNCTION | AUTO_RUN
			);

			expect(resolveFlags(producer, { lane: "lane" })).toEqual(
				CONFIG_FUNCTION | LANE
			);
		});
		it("should correctly infer configuration from producer: -- object with producer --", () => {
			let producer = () => 5;

			expect(resolveFlags({ producer })).toEqual(CONFIG_OBJECT);

			expect(resolveFlags({ producer }, { lazy: false })).toEqual(
				CONFIG_OBJECT | AUTO_RUN
			);

			expect(resolveFlags({ producer }, { lane: "lane" })).toEqual(
				CONFIG_OBJECT | LANE
			);

			// listen to the existing!
			expect(resolveFlags({ key: "key", producer }, {})).toEqual(CONFIG_OBJECT);

			expect(resolveFlags({ key: "key2", producer }, {})).toEqual(
				CONFIG_OBJECT
			);
		});
		it("should correctly infer configuration from object: -- remaining cases  --", () => {
			expect(
				resolveFlags(
					{
						key: "test",
						payload: {},
						lazy: false,
						producer: () => 5,
					},
				)
			).toEqual(CONFIG_OBJECT | AUTO_RUN);

			expect(
				resolveFlags({
					key: "key",
					payload: {},
					lazy: false,
					producer: () => 5,
				})
			).toEqual(CONFIG_OBJECT | AUTO_RUN);
		});
		it("should infer flags from overrides object", () => {
			expect(
				resolveFlags(
					{
						key: "test",
						payload: {},
						producer: () => 5,
					},
					{
						lazy: false,
						events: {
							change: () => {},
							subscribe: () => () => {},
						},
					}
				)
			).toEqual(CONFIG_OBJECT | AUTO_RUN | CHANGE_EVENTS | SUBSCRIBE_EVENTS);
		});
	});
});
