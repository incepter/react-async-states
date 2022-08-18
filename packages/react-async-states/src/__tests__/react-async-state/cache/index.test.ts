import AsyncState, {AsyncStateStatus, CachedState} from "../../../async-state";
import {flushPromises} from "../utils/test-utils";
import {
  standaloneProducerEffectsCreator
} from "../../../async-state/AsyncState";

describe('async state cache', () => {
  it('should load cache and pass it to lanes', () => {
    const cache = {};
    const load = jest.fn().mockImplementation(() => cache);
    const asyncState = new AsyncState("test", null, {
      initialValue: 0,
      cacheConfig: {
        load,
        enabled: true,
      }
    });

    expect(asyncState.currentState.data).toBe(0);
    expect(load).toHaveBeenCalled();
    asyncState.getLane("test");
    expect(asyncState.getLane("test").cache).toBe(asyncState.cache);
  });
  it('should add to cache and spread on lanes', () => {
    const cache: Record<string, CachedState<number>> = {
      [`1`]: {
        state: {
          data: 1,
          timestamp: 122,
          props: {args: [1]},
          status: AsyncStateStatus.success,
        },
        addedAt: 123,
        deadline: Infinity,
      },
    };
    const producer = jest.fn().mockImplementation(props => props.args?.[0]);
    const load = jest.fn().mockImplementation(() => cache);
    const asyncState = new AsyncState("test", producer, {
      initialValue: cache => cache[`1`]?.state?.data,
      cacheConfig: {
        load,
        enabled: true,
        hash: (args) => `${args?.[0]}`,
      }
    });

    expect(asyncState.currentState.data).toBe(1);
    expect(load).toHaveBeenCalled();
    asyncState.getLane("test");
    expect(asyncState.getLane("test").cache).toBe(asyncState.cache);

    asyncState.getLane("test").run(standaloneProducerEffectsCreator, 2);
    expect(asyncState.getLane("test").cache).toBe(asyncState.cache);
    expect(asyncState.getLane("test").cache[`2`]?.state?.data).toBe(2);

    producer.mockClear();
    asyncState.getLane("test").run(standaloneProducerEffectsCreator, 1);
    expect(asyncState.getLane("test").cache[`1`]?.state?.data).toBe(1);
    expect(asyncState.getLane("test").currentState.data).toBe(1);
    expect(producer).not.toHaveBeenCalled();
  });
  it('should set state when cache loads cache and pass it to lanes', async () => {
    const cache: Record<string, CachedState<number>> = {
      [`1`]: {
        state: {
          data: 1,
          timestamp: 122,
          props: {args: [1]},
          status: AsyncStateStatus.success,
        },
        addedAt: 123,
        deadline: Infinity,
      },
    };
    const load = jest.fn().mockImplementation(async () => Promise.resolve(cache));
    const asyncState = new AsyncState("test", null, {
      cacheConfig: {
        load,
        enabled: true,
        onCacheLoad({
          cache,
          setState
        }) {
          setState(cache[`1`].state.data);
        }
      }
    });

    await flushPromises();

    expect(asyncState.currentState.data).toBe(1);
    expect(load).toHaveBeenCalled();
  });
  it('should invalidate cache', async () => {
    const cache: Record<string, CachedState<number>> = {
      [`1`]: {
        state: {
          data: 1,
          timestamp: 122,
          props: {args: [1]},
          status: AsyncStateStatus.success,
        },
        addedAt: 123,
        deadline: 125,
      },
      [`2`]: {
        state: {
          data: 1,
          timestamp: 122,
          props: {args: [1]},
          status: AsyncStateStatus.success,
        },
        addedAt: 123,
        deadline: 125,
      },
    };
    const load = jest.fn().mockImplementation(() => cache);
    const asyncState = new AsyncState("test", null, {
      cacheConfig: {
        load,
        enabled: true,
      }
    });
    asyncState.invalidateCache(`1`);
    expect(asyncState.cache[`1`]).not.toBeDefined();
    expect(asyncState.cache[`2`]).toBeDefined();
    asyncState.invalidateCache();
    expect(asyncState.cache[`1`]).not.toBeDefined();
    expect(asyncState.cache[`2`]).not.toBeDefined();
    expect(asyncState.cache).toEqual({});
  });
});
