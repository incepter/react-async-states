import { act } from "@testing-library/react-hooks";
import AsyncState, { AsyncStateStatus } from "../../async-state";
import { timeout } from "./test-utils";
import { mockDateNow, TESTS_TS } from "../react-async-state/utils/setup";

jest.useFakeTimers("modern");
mockDateNow();

describe('AsyncState - subscriptions', () => {
  it('should subscribe to async-state and get notified', async () => {
    // given
    let myConfig = {initialValue: null};
    let key = "simulated";
    let subscriptionFn = jest.fn();
    let producer = timeout(50, "Some Value");

    // when
    let myAsyncState = new AsyncState(key, producer, myConfig);

    // then
    expect(myAsyncState.subsIndex).toBe(0);

    let unsubscribe = myAsyncState.subscribe(subscriptionFn);
    expect(typeof unsubscribe).toBe("function");

    myAsyncState.run(() => {
    });
    await act(async () => {
      await jest.advanceTimersByTime(50);
    });

    expect(subscriptionFn.mock.calls).toEqual(
      [
        [{
          props: {
            args: [],
            payload: {},
            lastSuccess: {
              timestamp: TESTS_TS,
              data: null, status: AsyncStateStatus.initial
            },
          },
          data: null,
          timestamp: TESTS_TS,
          status: AsyncStateStatus.pending
        }],
        [{
          props: {
            args: [],
            payload: {},
            lastSuccess: {
              timestamp: TESTS_TS,
              data: null, status: AsyncStateStatus.initial
            },
          },
          data: "Some Value",
          timestamp: TESTS_TS,
          status: AsyncStateStatus.success
        }]
      ]
    );
    expect(subscriptionFn).toHaveBeenCalledTimes(2);
    expect(myAsyncState.state).toEqual({
      props: {
        args: [],
        payload: {},
        lastSuccess: {
          timestamp: TESTS_TS,
          data: null, status: AsyncStateStatus.initial
        },
      },
      status: AsyncStateStatus.success,
      data: "Some Value",
      timestamp: TESTS_TS,
    });
  });
  it('should subscribe to async-state and unsubscribe before success and dispose when no subscribers', async () => {
    // given
    let key = "simulated";
    let subscriptionFn = jest.fn();
    let myConfig = {initialValue: null, resetStateOnDispose: true};
    let producer = timeout(50, "Some Value");

    // when
    let myAsyncState = new AsyncState(key, producer, myConfig);
    let unsubscribe = myAsyncState.subscribe(subscriptionFn);

    // then

    myAsyncState.run(() => {
    });
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
          props: {
            args: [],
            payload: {},
            lastSuccess: {
              timestamp: TESTS_TS,
              data: null, status: AsyncStateStatus.initial
            },
          }, data: null, status: AsyncStateStatus.pending, timestamp: TESTS_TS,
        }],
      ]
    );
    expect(subscriptionFn).toHaveBeenCalledTimes(1);
    expect(myAsyncState.state).toEqual({
      props: null,
      status: AsyncStateStatus.initial,
      data: null,
      timestamp: TESTS_TS,
    });
  });
  it('should subscribe to async-state and unsubscribe before running', async () => {
    // given
    let key = "simulated";
    let subscriptionFn = jest.fn();
    let myConfig = {initialValue: null};
    let producer = timeout(50, "Some Value");

    // when
    let myAsyncState = new AsyncState(key, producer, myConfig);
    let unsubscribe = myAsyncState.subscribe(subscriptionFn);
    unsubscribe();

    // then

    myAsyncState.run(() => {
    });
    await act(async () => {
      await jest.advanceTimersByTime(50);
    });

    expect(subscriptionFn.mock.calls).toEqual([]);
    expect(subscriptionFn).toHaveBeenCalledTimes(0);
    expect(myAsyncState.state).toEqual({ // original async state resolved, but we got notified neither by pending nor success
      props: {
        args: [],
        payload: {},
        lastSuccess: {
          timestamp: TESTS_TS,
          data: null, status: AsyncStateStatus.initial
        },
      },
      status: AsyncStateStatus.success,
      data: "Some Value",
      timestamp: TESTS_TS,
    });
  });
});
