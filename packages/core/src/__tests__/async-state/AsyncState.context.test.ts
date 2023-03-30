import {Sources} from "../../AsyncState";
import {createContext, terminateContext} from "../../pool";

describe('Create instances in different contexts', () => {
  let consoleErrorSpy;
  let originalConsoleError = console.error;
  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {})
  })
  afterAll(() => {
    console.error = originalConsoleError
  })

  it('should reuse the same instance when no context is provided', () => {
    consoleErrorSpy.mockClear()
    let source1 = Sources.for("key1")
    let source2 = Sources.for("key1")
    expect(source1).toBe(source2)
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
  });

  it('should reuse the same instance in the same pool', () => {
    let ctx = {}
    createContext(ctx)
    let source1 = Sources.for("key2", null, {context: ctx})
    let source2 = Sources.for("key2", null, {context: ctx})
    expect(source1).toBe(source2)
  });

  it('should use a different instance from different pools', () => {
    let ctx1 = {}
    let ctx2 = {}
    createContext(ctx1)
    createContext(ctx2)
    let source1 = Sources.for("key3", null, {context: ctx1})
    let source2 = Sources.for("key3", null, {context: ctx2})
    expect(source1).not.toBe(source2)
  });
  it('should throw when context isnt created first', () => {
    let ctx1 = {}
    expect(
      () => Sources.for("key4", null, {context: ctx1})
    ).toThrow("No execution context for context [object Object]")
  });
  it('should throw when context is already terminated', () => {
    let ctx = {}

    createContext(ctx)
    expect(() => Sources.for("key5", null, {context: ctx}))
      .not
      .toThrow("No execution context for context [object Object]")

    terminateContext(ctx)
    expect(() => Sources.for("key6", null, {context: ctx}))
      .toThrow("No execution context for context [object Object]")
  });
});
