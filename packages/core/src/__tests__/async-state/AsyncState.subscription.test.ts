import {
  AsyncState,
  standaloneProducerEffectsCreator,
  Status
} from "../..";
import {timeout} from "./test-utils";
import {mockDateNow, TESTS_TS} from "../utils/setup";

// @ts-ignore
jest.useFakeTimers("modern");
mockDateNow();

describe('AsyncState - subscriptions', () => {
  it('should subscribe to async-state and get notified', async () => {
    // given
    let myConfig = {initialValue: null, resetStateOnDispose: true};
    let key = "simulated";
    let subscriptionFn = jest.fn();
    let producer = timeout(50, "Some Value");

    // when
    let myAsyncState = new AsyncState(key, producer, myConfig);

    // then
    expect(myAsyncState.subsIndex).toBe(undefined);

    let unsubscribe = myAsyncState.subscribe({cb: subscriptionFn});
    expect(typeof unsubscribe).toBe("function");

    myAsyncState.run(standaloneProducerEffectsCreator);
    await jest.advanceTimersByTime(50);

    expect(subscriptionFn.mock.calls).toEqual(
      [
        [{
          props: {
            args: [],
            payload: {},
            lastSuccess: {
              timestamp: TESTS_TS,
              data: null, status: Status.initial
            },
          },
          data: null,
          timestamp: TESTS_TS,
          status: Status.pending
        }],
        [{
          props: {
            args: [],
            payload: {},
            lastSuccess: {
              timestamp: TESTS_TS,
              data: null, status: Status.initial
            },
          },
          data: "Some Value",
          timestamp: TESTS_TS,
          status: Status.success
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
          data: null, status: Status.initial
        },
      },
      status: Status.success,
      data: "Some Value",
      timestamp: TESTS_TS,
    });
  });
  it('should subscribe to async-state and unsubscribe before success and dispose when no subscribers', async () => {
    // given
    let key = "simulated-2";
    let subscriptionFn = jest.fn();
    let myConfig = {initialValue: null, resetStateOnDispose: true};
    let producer = timeout(50, "Some Value");

    // when
    let myAsyncState = new AsyncState(key, producer, myConfig);
    let unsubscribe = myAsyncState.subscribe({cb: subscriptionFn});

    // then

    myAsyncState.run(standaloneProducerEffectsCreator);
    await jest.advanceTimersByTime(49);
    unsubscribe!(); // unsubscribe one milli before resolve; we should only receive the pending notification
    await jest.advanceTimersByTime(5);

    expect(subscriptionFn.mock.calls).toEqual(
      [
        [{
          props: {
            args: [],
            payload: {},
            lastSuccess: {
              timestamp: TESTS_TS,
              data: null, status: Status.initial
            },
          }, data: null, status: Status.pending, timestamp: TESTS_TS,
        }],
      ]
    );
    expect(subscriptionFn).toHaveBeenCalledTimes(1);
    expect(myAsyncState.state).toEqual({
      props: null,
      status: Status.initial,
      data: null,
      timestamp: TESTS_TS,
    });
  });
  it('should subscribe to async-state and unsubscribe before running', async () => {
    // given
    let key = "simulated-3";
    let subscriptionFn = jest.fn();
    let myConfig = {initialValue: null};
    let producer = timeout(50, "Some Value");

    // when
    let myAsyncState = new AsyncState(key, producer, myConfig);
    let unsubscribe = myAsyncState.subscribe({cb: subscriptionFn});
    unsubscribe!();

    // then

    myAsyncState.run(standaloneProducerEffectsCreator);
    await jest.advanceTimersByTime(50);

    expect(subscriptionFn.mock.calls).toEqual([]);
    expect(subscriptionFn).toHaveBeenCalledTimes(0);
    expect(myAsyncState.state).toEqual({ // original async state resolved, but we got notified neither by pending nor success
      props: {
        args: [],
        payload: {},
        lastSuccess: {
          timestamp: TESTS_TS,
          data: null, status: Status.initial
        },
      },
      status: Status.success,
      data: "Some Value",
      timestamp: TESTS_TS,
    });
  });
});
