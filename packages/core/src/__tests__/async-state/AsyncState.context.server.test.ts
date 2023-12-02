import { requestContext } from "../../modules/StateContext";

jest.mock("../../utils", () => {
	return {
		...jest.requireActual("../../utils"),
		isServer: true,
	};
});
describe("createContext in the server", () => {
	it("should throw when no context is found in the server", () => {
		expect(() => requestContext({})).toThrow(
			"Context not found. Please make sure to call createContext before requestContext."
		);
	});
});
