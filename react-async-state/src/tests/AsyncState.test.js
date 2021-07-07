import { act } from "@testing-library/react-hooks";
import { rejectionTimeout, timeout } from "./test-utils";
import AsyncState from "../async-state/AsyncState";
import { ASYNC_STATUS } from "../utils";

jest.useFakeTimers();

describe('AsyncState', () => {
  it('should simulate async state and check fork count', () => {
    // given
    let key = "simulated";
    let promise = timeout(100, [{ id: 1, description: "value" }]);
    let myConfig = {};

    // when
    let myAsyncState = new AsyncState({ key, promise, config: myConfig });

    // then
    expect(myAsyncState.key).toBe(key);
    expect(myAsyncState.forkCount).toBe(0);
    expect(myAsyncState.config).toBe(myConfig);
    expect(myAsyncState.oldState).toBe(undefined);
    expect(myAsyncState.subscriptions).toEqual({});
    expect(typeof myAsyncState.run).toBe("function");
    expect(myAsyncState.currentState).toEqual({ data: null, status: ASYNC_STATUS.initial, args: null });

    let forkedAsyncState = myAsyncState.fork();
    expect(myAsyncState.forkCount).toBe(1);
    expect(forkedAsyncState.forkCount).toBe(0);
    expect(forkedAsyncState.config).toBe(myAsyncState.config);
    expect(forkedAsyncState.oldState).toBe(myAsyncState.oldState); // undefined
    expect(forkedAsyncState.originalPromise).toBe(myAsyncState.originalPromise);


    expect(forkedAsyncState.key).not.toBe(myAsyncState.key);
    expect(forkedAsyncState.promise).not.toBe(myAsyncState.promise);
    expect(forkedAsyncState.currentState).not.toBe(myAsyncState.currentState);// not same reference even if retrieved
    expect(forkedAsyncState.subscriptions).not.toBe(myAsyncState.subscriptions);// not same reference even if retrieved
  });

  it('should run an async state successfully with no subscribers', async () => {
    // given
    let key = "simulated";
    let promise = timeout(100, [{ id: 1, description: "value" }]);
    let myConfig = {};

    // when
    let myAsyncState = new AsyncState({ key, promise, config: myConfig });

    // then
    // should have initial status
    expect(myAsyncState.currentState).toEqual({
      args: null,
      data: null,
      status: ASYNC_STATUS.initial,
    });

    myAsyncState.run();
    // should transition synchronously to loading state
    expect(myAsyncState.currentState).toEqual({
      args: [],
      data: null,
      status: ASYNC_STATUS.loading,
    });
    await act(async () => {
      await jest.advanceTimersByTime(50);
    });
    // should be still in loading state while promise did not resolve yet
    expect(myAsyncState.currentState).toEqual({
      args: [],
      data: null,
      status: ASYNC_STATUS.loading,
    });

    await act(async () => {
      await jest.advanceTimersByTime(50);
    });

    // async state should be in success state with data
    expect(myAsyncState.currentState).toEqual({
      args: [],
      status: ASYNC_STATUS.success,
      data: [{ id: 1, description: "value" }],
    });
  });
  it('should run an async state with rejection with no subscribers', async () => {
    // given
    let key = "simulated";
    let promise = rejectionTimeout(50, "Some Error");
    let myConfig = {};

    // when
    let myAsyncState = new AsyncState({ key, promise, config: myConfig });

    // then
    myAsyncState.run();
    await act(async () => {
      await jest.advanceTimersByTime(50);
    });
    // async state should be in success state with data
    expect(myAsyncState.currentState).toEqual({
      args: [],
      status: ASYNC_STATUS.error,
      data: "Some Error",
    });
  });
  it('should subscribe to async-state and get notified', async () => {
    // given
    let myConfig = {};
    let key = "simulated";
    let subscriptionFn = jest.fn();
    let promise = timeout(50, "Some Value");

    // when
    let myAsyncState = new AsyncState({ key, promise, config: myConfig });

    // then
    expect(myAsyncState.subscriptionsMeter).toBe(0);

    let unsubscribe = myAsyncState.subscribe(subscriptionFn);
    expect(typeof unsubscribe).toBe("function");

    myAsyncState.run();
    await act(async () => {
      await jest.advanceTimersByTime(50);
    });

    expect(subscriptionFn.mock.calls).toEqual(
      [
        [{args: [], data: null, status: ASYNC_STATUS.loading}],
        [{args: [], data: "Some Value", status: ASYNC_STATUS.success}]
      ]
    );
    expect(subscriptionFn).toHaveBeenCalledTimes(2);
    expect(myAsyncState.currentState).toEqual({
      args: [],
      status: ASYNC_STATUS.success,
      data: "Some Value",
    });
  });
  it('should subscribe to async-state and unsubscribe before success', async () => {
    // given
    let myConfig = {};
    let key = "simulated";
    let subscriptionFn = jest.fn();
    let promise = timeout(50, "Some Value");

    // when
    let myAsyncState = new AsyncState({ key, promise, config: myConfig });
    let unsubscribe = myAsyncState.subscribe(subscriptionFn);

    // then

    myAsyncState.run();
    await act(async () => {
      await jest.advanceTimersByTime(49);
    });
    unsubscribe();
    await act(async () => {
      await jest.advanceTimersByTime(5);
    });

    expect(subscriptionFn.mock.calls).toEqual(
      [
        [{args: [], data: null, status: ASYNC_STATUS.loading}],
      ]
    );
    expect(subscriptionFn).toHaveBeenCalledTimes(1);
    expect(myAsyncState.currentState).toEqual({
      args: [],
      status: ASYNC_STATUS.success,
      data: "Some Value",
    });
  });
  it('should subscribe to async-state and unsubscribe before running', async () => {
    // given
    let myConfig = {};
    let key = "simulated";
    let subscriptionFn = jest.fn();
    let promise = timeout(50, "Some Value");

    // when
    let myAsyncState = new AsyncState({ key, promise, config: myConfig });
    let unsubscribe = myAsyncState.subscribe(subscriptionFn);
    unsubscribe();

    // then

    myAsyncState.run();
    await act(async () => {
      await jest.advanceTimersByTime(50);
    });

    expect(subscriptionFn.mock.calls).toEqual([]);
    expect(subscriptionFn).toHaveBeenCalledTimes(0);
    expect(myAsyncState.currentState).toEqual({
      args: [],
      status: ASYNC_STATUS.success,
      data: "Some Value",
    });
  });
});
