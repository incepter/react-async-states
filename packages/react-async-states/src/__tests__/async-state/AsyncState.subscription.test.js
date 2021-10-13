import { act } from "@testing-library/react-hooks";
import AsyncState from "async-state";
import { AsyncStateStatus } from "shared";
import { timeout } from "./test-utils";

jest.useFakeTimers("modern");

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
          argv: {
            payload: {},
            lastSuccess: {
              data: null, status: AsyncStateStatus.initial
            },
          },
          data: null,
          status: AsyncStateStatus.pending
        }],
        [{
          argv: {
            payload: {},
            lastSuccess: {
              data: null, status: AsyncStateStatus.initial
            },
          },
          data: "Some Value",
          status: AsyncStateStatus.success
        }]
      ]
    );
    expect(subscriptionFn).toHaveBeenCalledTimes(2);
    expect(myAsyncState.currentState).toEqual({
      argv: {
        payload: {},
        lastSuccess: {
          data: null, status: AsyncStateStatus.initial
        },
      },
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
    unsubscribe(); // unsubscribe one milli before resolve; we should only receive the pending notification
    await act(async () => {
      await jest.advanceTimersByTime(5);
    });

    expect(subscriptionFn.mock.calls).toEqual(
      [
        [{
          argv: {
            payload: {},
            lastSuccess: {
              data: null, status: AsyncStateStatus.initial
            },
          }, data: null, status: AsyncStateStatus.pending
        }],
      ]
    );
    expect(subscriptionFn).toHaveBeenCalledTimes(1);
    expect(myAsyncState.currentState).toEqual({
      argv: {
        payload: {},
        lastSuccess: {
          data: null, status: AsyncStateStatus.initial
        },
      },
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
    expect(myAsyncState.currentState).toEqual({ // original async state resolved, but we got notified neither by pending nor success
      argv: {
        payload: {},
        lastSuccess: {
          data: null, status: AsyncStateStatus.initial
        },
      },
      status: AsyncStateStatus.success,
      data: "Some Value",
    });
  });
});
