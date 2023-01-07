import {rejectionTimeout, timeout} from "./test-utils";
import {mockDateNow, TESTS_TS} from "../utils/setup";
import {
  AsyncState,
  Status
} from "../..";

// @ts-ignore
jest.useFakeTimers("modern");
mockDateNow();

describe('AsyncState - run - abort', () => {

  it('should abort while pending and check state did not update after supposed resolve', async () => {
    // given
    let key = "simulated-1";
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
      status: Status.initial,
    });

    const abort = myAsyncState.run();

    await jest.advanceTimersByTime(50);


    expect(subscription).toHaveBeenCalledTimes(1);
    expect(subscription).toHaveBeenCalledWith({
      props: {
        args: [],
        payload: {},
        lastSuccess: {
          timestamp: TESTS_TS,
          data: null, status: Status.initial,
        },
      },
      data: null,
      timestamp: TESTS_TS,
      status: Status.pending,
    });

    subscription.mockClear();
    abort!("reason");

    expect(subscription).toHaveBeenCalledTimes(1);
    expect(subscription).toHaveBeenCalledWith({
      props: {
        args: [],
        lastSuccess: {
          data: null, status: Status.initial, timestamp: TESTS_TS,

        },
        payload: {}
      },
      data: "reason", timestamp: TESTS_TS,
      status: Status.aborted,
    });

    expect(myAsyncState.state).toEqual({
      props: {
        args: [],
        lastSuccess: {
          timestamp: TESTS_TS,
          data: null, status: Status.initial
        },
        payload: {}
      },
      timestamp: TESTS_TS,
      data: "reason",
      status: Status.aborted,
    });

    await jest.advanceTimersByTime(50);

    // async state should be in success state with data
    expect(myAsyncState.state).toEqual({
      props: {
        args: [],
        lastSuccess: {
          timestamp: TESTS_TS,
          data: null, status: Status.initial
        },
        payload: {}
      },
      timestamp: TESTS_TS,
      status: Status.aborted,
      data: "reason",
    });
  });

  it('should abort while pending and check state did not update after supposed rejection', async () => {
    // given
    let key = "simulated-2";
    let producer = rejectionTimeout(100, "reason");
    let myConfig = {initialValue: null};
    let subscription = jest.fn();

    // when
    let myAsyncState = new AsyncState(key, producer, myConfig);
    myAsyncState.subscribe({cb: subscription});
    // then

    const abort = myAsyncState.run();

    await jest.advanceTimersByTime(50);

    subscription.mockClear();
    abort!("reason");
    expect(subscription.mock.calls[0][0].status).toBe(Status.aborted);

    // now, let's check that a second call to the abort function does not update state or subscribers
    subscription.mockClear();
    let currentStateReference = myAsyncState.state;
    abort!("whatever is ignored");
    expect(myAsyncState.state).toBe(currentStateReference);

    expect(subscription).not.toHaveBeenCalled();

    await jest.advanceTimersByTime(50);

    // async state should be in success state with data
    expect(myAsyncState.state).toEqual({
      props: {
        args: [],
        payload: {},
        lastSuccess: {
          data: null,
          timestamp: TESTS_TS,
          status: Status.initial,
        },
      },
      timestamp: TESTS_TS,
      status: Status.aborted,
      data: "reason",
    });
  });
  it('should bailout aborted state when it will be running again', async () => {
    // given
    let key = "simulated-3";
    let producer = timeout(100, "value");
    let myConfig = {initialValue: null};
    let subscription = jest.fn();

    // when
    let myAsyncState = new AsyncState(key, producer, myConfig);

    myAsyncState.subscribe({cb: subscription});
    // then

    myAsyncState.run();

    await jest.advanceTimersByTime(50);

    expect(myAsyncState.state.status).toBe(Status.pending);

    // rerun while pending should interrupt previous
    subscription.mockClear();
    myAsyncState.run();

    expect(subscription.mock.calls[0][0].status).toBe(Status.pending);

    expect(subscription).toHaveBeenCalledTimes(1);


    await jest.advanceTimersByTime(100);

    // async state should be in success state with data
    expect(myAsyncState.state).toEqual({
      props: {
        args: [],
        lastSuccess: {
          timestamp: TESTS_TS,
          data: null, status: Status.initial
        },
        payload: {}
      },
      timestamp: TESTS_TS,
      status: Status.success,
      data: "value",
    });
  });
});
