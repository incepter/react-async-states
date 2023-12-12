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
    myAsyncState.actions.subscribe({cb: subscription});
    // then
    // should have initial status
    expect(myAsyncState.state).toEqual({
      props: null,
      data: null,
      timestamp: TESTS_TS,
      status: "initial",
    });

    const abort = myAsyncState.actions.run();

    await jest.advanceTimersByTime(50);


    expect(subscription).toHaveBeenCalledTimes(1);
    expect(subscription).toHaveBeenCalledWith({
      props: {
        args: [],
        payload: {}
      },
      prev: {
        data: null,
        props: null,
        status: "initial",
        timestamp: TESTS_TS,
      },
      data: null,
      timestamp: TESTS_TS,
      status: "pending",
    });

    subscription.mockClear();
    abort!("reason");

    expect(subscription).toHaveBeenCalledTimes(1);

    expect(myAsyncState.state).toEqual({
      data: null,
      props: null,
      timestamp: TESTS_TS,
      status: "initial",
    });

    await jest.advanceTimersByTime(50);

    // async state should be in success state with data
    expect(myAsyncState.state).toEqual({
      props: null,
      timestamp: TESTS_TS,
      status: "initial",
      data: null,
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
    myAsyncState.actions.subscribe({cb: subscription});
    // then

    const abort = myAsyncState.actions.run();

    await jest.advanceTimersByTime(50);

    subscription.mockClear();
    abort!("reason");
    expect(subscription.mock.calls[0][0].status).toBe("initial");

    // now, let's check that a second call to the abort function does not update state or subscribers
    subscription.mockClear();
    let currentStateReference = myAsyncState.state;
    abort!("whatever is ignored");
    expect(myAsyncState.state).toBe(currentStateReference);

    expect(subscription).not.toHaveBeenCalled();

    await jest.advanceTimersByTime(50);

    // async state should be in success state with data
    expect(myAsyncState.state).toEqual({
      props: null,
      timestamp: TESTS_TS,
      status: "initial",
      data: null,
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

    myAsyncState.actions.subscribe({cb: subscription});
    // then

    myAsyncState.actions.run();

    await jest.advanceTimersByTime(50);

    expect(myAsyncState.state.status).toBe("pending");

    // rerun while pending should interrupt previous
    subscription.mockClear();
    myAsyncState.actions.run();

    expect(subscription.mock.calls[0][0].status).toBe("pending");

    expect(subscription).toHaveBeenCalledTimes(1);


    await jest.advanceTimersByTime(100);

    // async state should be in success state with data
    expect(myAsyncState.state).toEqual({
      props: {
        args: [],
        payload: {}
      },
      timestamp: TESTS_TS,
      status: "success",
      data: "value",
    });
  });
});
