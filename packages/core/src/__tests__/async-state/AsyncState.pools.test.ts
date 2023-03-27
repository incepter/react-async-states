import {AsyncState, Sources} from "../../AsyncState";
import {requestContext} from "../../pool";
import {flushPromises} from "../utils/test-utils";

describe('Create instances in different pools', () => {
  let consoleErrorSpy;
  let originalConsoleError = console.error;
  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {})
  })
  afterAll(() => {
    console.error = originalConsoleError
  })

  it('should reuse the same instance when no pool is provided', () => {
    consoleErrorSpy.mockClear()
    let source1 = Sources.for("key1")
    let source2 = Sources.for("key1")
    let source3 = Sources.for("another1")
    expect(source1).toBe(source2)
    expect(source1).not.toBe(source3)
    expect(source2).not.toBe(source3)
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
  });

  it('should reuse the same instance in the same pool', () => {
    consoleErrorSpy.mockClear()
    let source1 = Sources.for("key2", null, {pool: "pool-1"})
    let source2 = Sources.for("key2", null, {pool: "pool-1"})
    expect(source1).toBe(source2)
  });

  it('should use a different instance from different pools', () => {
    consoleErrorSpy.mockClear()
    let source1 = Sources.for("key3", null, {pool: "pool-1"})
    let source2 = Sources.for("key3", null, {pool: "pool-2"})
    expect(source1).not.toBe(source2)
  });

  it('should merge payload inside all pools instances', () => {
    let testPool = requestContext(null).getOrCreatePool("test-pool")

    // @ts-ignore
    testPool.set(null, {})
    expect(testPool.instances.size).toBe(0) // nothing was added


    let src = Sources.for("test-key", null, {pool: "test-pool"})
    let src2 = Sources.for("test-key2", null, {pool: "test-pool"})
    expect(src.getPayload()).toEqual({})
    expect(src.getPayload()).toEqual({})
    expect(testPool.instances.size).toBe(2)

    testPool.mergePayload({hello: true})
    expect(src.getPayload()).toEqual({hello: true})

    src.mergePayload({ok: true})
    testPool.mergePayload({ok2: true})
    expect(src.getPayload()).toEqual({hello: true, ok: true, ok2: true})
    expect(src2.getPayload()).toEqual({hello: true, ok2: true})
  });

  it('should listen to instances being added to pool', async () => {
    let testPool = requestContext(null).getOrCreatePool("test-pool")

    let handler = jest.fn()
    testPool.listen(handler)

    let src = new AsyncState("test-key3", null, {pool: "test-pool"})
    await flushPromises();

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(src, "test-key3")
  });
  it('should watch over an instance in the pool', async () => {
    let testPool = requestContext(null).getOrCreatePool("test-pool")

    let handler = jest.fn()
    testPool.watch("test-key4", handler)

    let src = new AsyncState("test-key4", null, {pool: "test-pool"})
    await flushPromises();
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(src, "test-key4")

    handler.mockClear()
    let src2 = new AsyncState("test-key5", null, {pool: "test-pool"})
    await flushPromises();
    expect(handler).not.toHaveBeenCalled()

    handler.mockClear()
    let src3 = new AsyncState("test-key4", null, {pool: "test-pool"})
    testPool.set("test-key4", src3)
    await flushPromises();
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(src3, "test-key4")
  });
});
