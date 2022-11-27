import { act } from "@testing-library/react-hooks";
import AsyncState, { AsyncStateStatus } from "../../async-state";
import { rejectionTimeout, timeout } from "./test-utils";
import { mockDateNow, TESTS_TS } from "../react-async-state/utils/setup";
import {standaloneProducerEffectsCreator} from "../../async-state/AsyncState";

// @ts-ignore
jest.useFakeTimers("modern");
mockDateNow();

describe('AsyncState - run - abort', () => {

  it('should abort while pending and check state did not update after supposed resolve', async () => {
    // given
    let key = "simulated";
    let producer = timeout(100, [{id: 1, description: "value"}]);
    let myConfig = {initialValue: null};
    let subscription = jest.fn();

    // when
    let myAsyncState = new AsyncState(key, producer, myConfig);
    myAsyncState.subscribe({cb: subscription});
    // then
    // should have initial status
    expect(myAsyncState.state).toEqual({
      props: null,
      data: null,
      timestamp: TESTS_TS,
      status: AsyncStateStatus.initial,
    });

    const abort = myAsyncState.run(standaloneProducerEffectsCreator);

    await act(async () => {
      await jest.advanceTimersByTime(50);
    });


    expect(subscription).toHaveBeenCalledTimes(1);
    expect(subscription).toHaveBeenCalledWith({
      props: {
        args: [],
        payload: {},
        lastSuccess: {
          timestamp: TESTS_TS,
          data: null, status: AsyncStateStatus.initial,
        },
      },
      data: null,
      timestamp: TESTS_TS,
      status: AsyncStateStatus.pending,
    });

    subscription.mockClear();
    abort("reason");

    expect(subscription).toHaveBeenCalledTimes(1);
    expect(subscription).toHaveBeenCalledWith({
      props: {
        args: [],
        lastSuccess: {
          data: null, status: AsyncStateStatus.initial, timestamp: TESTS_TS,

        },
        payload: {}
      },
      data: "reason", timestamp: TESTS_TS,
      status: AsyncStateStatus.aborted,
    });

    expect(myAsyncState.state).toEqual({
      props: {
        args: [],
        lastSuccess: {
          timestamp: TESTS_TS,
          data: null, status: AsyncStateStatus.initial
        },
        payload: {}
      },
      timestamp: TESTS_TS,
      data: "reason",
      status: AsyncStateStatus.aborted,
    });

    await act(async () => {
      await jest.advanceTimersByTime(50);
    });

    // async state should be in success state with data
    expect(myAsyncState.state).toEqual({
      props: {
        args: [],
        lastSuccess: {
          timestamp: TESTS_TS,
          data: null, status: AsyncStateStatus.initial
        },
        payload: {}
      },
      timestamp: TESTS_TS,
      status: AsyncStateStatus.aborted,
      data: "reason",
    });
  });

  it('should abort while pending and check state did not update after supposed rejection', async () => {
    // given
    let key = "simulated";
    let producer = rejectionTimeout(100, "reason");
    let myConfig = {initialValue: null};
    let subscription = jest.fn();

    // when
    let myAsyncState = new AsyncState(key, producer, myConfig);
    myAsyncState.subscribe({cb: subscription});
    // then

    const abort = myAsyncState.run(standaloneProducerEffectsCreator);

    await act(async () => {
      await jest.advanceTimersByTime(50);
    });

    subscription.mockClear();
    abort("reason");
    expect(subscription.mock.calls[0][0].status).toBe(AsyncStateStatus.aborted);

    // now, let's check that a second call to the abort function does not update state or subscribers
    subscription.mockClear();
    let currentStateReference = myAsyncState.state;
    abort("whatever is ignored");
    expect(myAsyncState.state).toBe(currentStateReference);

    expect(subscription).not.toHaveBeenCalled();

    await act(async () => {
      await jest.advanceTimersByTime(50);
    });

    // async state should be in success state with data
    expect(myAsyncState.state).toEqual({
      props: {
        args: [],
        payload: {},
        lastSuccess: {
          data: null,
          timestamp: TESTS_TS,
          status: AsyncStateStatus.initial,
        },
      },
      timestamp: TESTS_TS,
      status: AsyncStateStatus.aborted,
      data: "reason",
    });
  });
  it('should bailout aborted state when it will be running again', async () => {
    // given
    let key = "simulated";
    let producer = timeout(100, "value");
    let myConfig = {initialValue: null};
    let subscription = jest.fn();

    // when
    let myAsyncState = new AsyncState(key, producer, myConfig);

    myAsyncState.subscribe({cb: subscription});
    // then

    myAsyncState.run(standaloneProducerEffectsCreator);

    await act(async () => {
      await jest.advanceTimersByTime(50);
    });

    expect(myAsyncState.state.status).toBe(AsyncStateStatus.pending);

    // rerun while pending should interrupt previous
    subscription.mockClear();
    myAsyncState.run(standaloneProducerEffectsCreator);

    expect(subscription.mock.calls[0][0].status).toBe(AsyncStateStatus.pending);

    expect(subscription).toHaveBeenCalledTimes(1);


    await act(async () => {
      await jest.advanceTimersByTime(100);
    });

    // async state should be in success state with data
    expect(myAsyncState.state).toEqual({
      props: {
        args: [],
        lastSuccess: {
          timestamp: TESTS_TS,
          data: null, status: AsyncStateStatus.initial
        },
        payload: {}
      },
      timestamp: TESTS_TS,
      status: AsyncStateStatus.success,
      data: "value",
    });
  });
});
