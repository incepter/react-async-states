import {requestContext} from "../../pool";

jest.mock("../../utils", () => {
  return {
    ...jest.requireActual("../../utils"),
    isServer: true,
  }
})
describe('createContext in the server', () => {
  it('should throw when no context is found in the server', () => {
    let originalConsoleError = console.error;
    console.error = jest.fn()
    expect(() => requestContext({}))
      .toThrow("You should always provide an execution context in the server")
    expect(console.error).toHaveBeenCalledTimes(1)
    console.error = originalConsoleError
  });
});
