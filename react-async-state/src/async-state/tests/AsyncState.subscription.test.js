import { act } from "@testing-library/react-hooks";
import { timeout } from "./test-utils";
import AsyncState from "../AsyncState";
import { AsyncStateStatus } from "../../shared";

jest.useFakeTimers();

describe('AsyncState - subscriptions', () => {
  it('should subscribe to async-state and get notified', async () => {
    // given
    let myConfig = {};
    let key = "simulated";
    let subscriptionFn = jest.fn();
    let promise = timeout(50, "Some Value");

    // when
    let myAsyncState = new AsyncState(key, promise, myConfig);

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
        [{
          args: [{
            executionArgs: [],
            lastSuccess: undefined,
            onAbort: expect.any(Function),
            aborted: false,
            payload: null,
          }], data: null, status: AsyncStateStatus.loading
        }],
        [{
          args: [{
            executionArgs: [],
            lastSuccess: undefined,
            onAbort: expect.any(Function),
            aborted: false,
            payload: null
          }], data: "Some Value", status: AsyncStateStatus.success
        }]
      ]
    );
    expect(subscriptionFn).toHaveBeenCalledTimes(2);
    expect(myAsyncState.currentState).toEqual({
      args: [{
        executionArgs: [],
        lastSuccess: undefined,
        onAbort: expect.any(Function),
        aborted: false,
        payload: null
      }],
      status: AsyncStateStatus.success,
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
    let myAsyncState = new AsyncState(key, promise, myConfig);
    let unsubscribe = myAsyncState.subscribe(subscriptionFn);

    // then

    myAsyncState.run();
    await act(async () => {
      await jest.advanceTimersByTime(49);
    });
    unsubscribe(); // unsubscribe one milli before resolve; we should only receive the loading notification
    await act(async () => {
      await jest.advanceTimersByTime(5);
    });

    expect(subscriptionFn.mock.calls).toEqual(
      [
        [{
          args: [{
            executionArgs: [],
            lastSuccess: undefined,
            onAbort: expect.any(Function),
            aborted: false,
            payload: null
          }], data: null, status: AsyncStateStatus.loading
        }],
      ]
    );
    expect(subscriptionFn).toHaveBeenCalledTimes(1);
    expect(myAsyncState.currentState).toEqual({
      args: [{
        executionArgs: [],
        lastSuccess: undefined,
        onAbort: expect.any(Function),
        aborted: false,
        payload: null
      }],
      status: AsyncStateStatus.success,
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
    let myAsyncState = new AsyncState(key, promise, myConfig);
    let unsubscribe = myAsyncState.subscribe(subscriptionFn);
    unsubscribe();

    // then

    myAsyncState.run();
    await act(async () => {
      await jest.advanceTimersByTime(50);
    });

    expect(subscriptionFn.mock.calls).toEqual([]);
    expect(subscriptionFn).toHaveBeenCalledTimes(0);
    expect(myAsyncState.currentState).toEqual({ // original async state resolved, but we got notified neither by loading nor success
      args: [{
        executionArgs: [],
        lastSuccess: undefined,
        onAbort: expect.any(Function),
        aborted: false,
        payload: null
      }],
      status: AsyncStateStatus.success,
      data: "Some Value",
    });
  });
});
