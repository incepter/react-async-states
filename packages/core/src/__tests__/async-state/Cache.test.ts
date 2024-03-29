import { AsyncState } from "../../AsyncState";
import { CachedState } from "../../types";
import { Status } from "../../enums";
import { flushPromises } from "../utils/test-utils";

describe("async state cache", () => {
  it("should load cache and pass it to lanes", () => {
    const cache = {};
    const load = jest.fn().mockImplementation(() => cache);
    const asyncState = new AsyncState("test", null, {
      initialValue: 0,
      cacheConfig: {
        load,
        enabled: true,
      },
    });

    expect(asyncState.state.data).toBe(0);
    expect(load).toHaveBeenCalled();
    asyncState.actions.getLane("test-lane");
    expect(asyncState.actions.getLane("test-lane").inst.cache).toBe(
      asyncState.cache
    );
  });
  it("should add to cache and spread on lanes", () => {
    const cache: Record<string, CachedState<number, any, any>> = {
      [`1`]: {
        state: {
          data: 1,
          timestamp: 122,
          props: { args: [1], payload: {} },
          status: "success",
        },
        addedAt: 123,
        deadline: Infinity,
      },
    };
    const producer = jest.fn().mockImplementation((props) => props.args?.[0]);
    const load = jest.fn().mockImplementation(() => cache);
    const asyncState = new AsyncState("test-2", producer, {
      initialValue: (cache) => cache![`1`]?.state?.data,
      cacheConfig: {
        load,
        enabled: true,
        hash: (args) => `${args?.[0]}`,
      },
    });

    expect(asyncState.state.data).toBe(1);
    expect(load).toHaveBeenCalled();
    asyncState.actions.getLane("test2-lane");
    expect(asyncState.actions.getLane("test2-lane").inst.cache).toBe(
      asyncState.cache
    );

    asyncState.actions.getLane("test2-lane").run(2);
    expect(asyncState.actions.getLane("test2-lane").inst.cache).toBe(
      asyncState.cache
    );
    expect(
      asyncState.actions.getLane("test2-lane").inst.cache![`2`]?.state?.data
    ).toBe(2);

    producer.mockClear();
    asyncState.actions.getLane("test2-lane").run(1);
    expect(
      asyncState.actions.getLane("test2-lane").inst.cache![`1`]?.state?.data
    ).toBe(1);
    expect(asyncState.actions.getLane("test2-lane").inst.state.data).toBe(1);
    expect(producer).not.toHaveBeenCalled();
  });
  it("should set state when cache loads cache and pass it to lanes", async () => {
    const cache: Record<string, CachedState<number, any, any>> = {
      [`1`]: {
        state: {
          data: 1,
          timestamp: 122,
          props: { args: [1], payload: {} },
          status: "success",
        },
        addedAt: 123,
        deadline: Infinity,
      },
    };
    const load = jest
      .fn()
      .mockImplementation(async () => Promise.resolve(cache));
    const asyncState = new AsyncState("test-3", null, {
      cacheConfig: {
        load,
        enabled: true,
        onCacheLoad({ cache, source }) {
          source.setState(cache[`1`].state.data);
        },
      },
    });

    await flushPromises();

    expect(asyncState.state.data).toBe(1);
    expect(load).toHaveBeenCalled();
  });
  it("should invalidate cache", async () => {
    const cache: Record<string, CachedState<number, any, any>> = {
      [`1`]: {
        state: {
          data: 1,
          timestamp: 122,
          props: { args: [1], payload: {} },
          status: "success",
        },
        addedAt: 123,
        deadline: 125,
      },
      [`2`]: {
        state: {
          data: 1,
          timestamp: 122,
          props: { args: [1], payload: {} },
          status: "success",
        },
        addedAt: 123,
        deadline: 125,
      },
    };
    const load = jest.fn().mockImplementation(() => cache);
    const asyncState = new AsyncState("test-4", null, {
      cacheConfig: {
        load,
        enabled: true,
      },
    });
    asyncState.actions.invalidateCache(`1`);
    expect(asyncState.cache![`1`]).not.toBeDefined();
    expect(asyncState.cache![`2`]).toBeDefined();
    asyncState.actions.invalidateCache();
    expect(asyncState.cache![`1`]).not.toBeDefined();
    expect(asyncState.cache![`2`]).not.toBeDefined();
    expect(asyncState.cache).toEqual({});
  });
});
