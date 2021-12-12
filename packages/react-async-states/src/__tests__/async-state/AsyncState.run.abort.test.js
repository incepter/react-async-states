import { act } from "@testing-library/react-hooks";
import AsyncState from "async-state";
import { AsyncStateStatus } from "shared";
import { rejectionTimeout, timeout } from "./test-utils";

jest.useFakeTimers("modern");

describe('AsyncState - run - abort', () => {

  it('should abort while pending and check state did not update after supposed resolve', async () => {
    // given
    let key = "simulated";
    let producer = timeout(100, [{id: 1, description: "value"}]);
    let myConfig = {};
    let subscription = jest.fn();

    // when
    let myAsyncState = new AsyncState(key, producer, myConfig);
    myAsyncState.subscribe(subscription);
    // then
    // should have initial status
    expect(myAsyncState.currentState).toEqual({
      props: null,
      data: null,
      status: AsyncStateStatus.initial,
    });

    const abort = myAsyncState.run();

    await act(async () => {
      await jest.advanceTimersByTime(50);
    });


    expect(subscription).toHaveBeenCalledTimes(1);
    expect(subscription).toHaveBeenCalledWith({
      props: {
        payload: {},
        lastSuccess: {
          data: null, status: AsyncStateStatus.initial,
        },
      },
      data: null,
      status: AsyncStateStatus.pending,
    });

    subscription.mockClear();
    abort("reason");

    expect(subscription).toHaveBeenCalledTimes(1);
    expect(subscription).toHaveBeenCalledWith({
      props: {
        lastSuccess: {
          data: null,  status: AsyncStateStatus.initial
        },
        payload: {}
      },
      data: "reason",
      status: AsyncStateStatus.aborted,
    });

    expect(myAsyncState.currentState).toEqual({
      props: {
        lastSuccess: {
          data: null, status: AsyncStateStatus.initial
        },
        payload: {}
      },
      data: "reason",
      status: AsyncStateStatus.aborted,
    });

    await act(async () => {
      await jest.advanceTimersByTime(50);
    });

    // async state should be in success state with data
    expect(myAsyncState.currentState).toEqual({
      props: {
        lastSuccess: {
          data: null, status: AsyncStateStatus.initial
        },
        payload: {}
      },
      status: AsyncStateStatus.aborted,
      data: "reason",
    });
  });

  it('should abort while pending and check state did not update after supposed rejection', async () => {
    // given
    let key = "simulated";
    let producer = rejectionTimeout(100, "reason");
    let myConfig = {};
    let subscription = jest.fn();

    // when
    let myAsyncState = new AsyncState(key, producer, myConfig);
    myAsyncState.subscribe(subscription);
    // then

    const abort = myAsyncState.run();

    await act(async () => {
      await jest.advanceTimersByTime(50);
    });

    subscription.mockClear();
    abort("reason");
    expect(subscription.mock.calls[0][0].status).toBe(AsyncStateStatus.aborted);

    // now, let's check that a second call to the abort function does not update state or subscribers
    subscription.mockClear();
    let currentStateReference = myAsyncState.currentState;
    abort("whatever is ignored");
    expect(myAsyncState.currentState).toBe(currentStateReference);

    expect(subscription).not.toHaveBeenCalled();

    await act(async () => {
      await jest.advanceTimersByTime(50);
    });

    // async state should be in success state with data
    expect(myAsyncState.currentState).toEqual({
      props: {
        payload: {},
        lastSuccess: {
          data: null,
          status: AsyncStateStatus.initial,
        },
      },
      status: AsyncStateStatus.aborted,
      data: "reason",
    });
  });
  it('should automatically abort previous producer and start new one', async () => {
    // given
    let key = "simulated";
    let producer = timeout(100, "value");
    let myConfig = {};
    let subscription = jest.fn();

    // when
    let myAsyncState = new AsyncState(key, producer, myConfig);

    myAsyncState.subscribe(subscription);
    // then

    myAsyncState.run();

    await act(async () => {
      await jest.advanceTimersByTime(50);
    });

    expect(myAsyncState.currentState.status).toBe(AsyncStateStatus.pending);

    // rerun while pending should interrupt previous
    subscription.mockClear();
    myAsyncState.run();

    expect(subscription.mock.calls[0][0].status).toBe(AsyncStateStatus.aborted);
    expect(subscription.mock.calls[1][0].status).toBe(AsyncStateStatus.pending);

    expect(subscription).toHaveBeenCalledTimes(2);


    await act(async () => {
      await jest.advanceTimersByTime(100);
    });

    // async state should be in success state with data
    expect(myAsyncState.currentState).toEqual({
      props: {
        lastSuccess: {
          data: null, status: AsyncStateStatus.initial
        },
        payload: {}
      },
      status: AsyncStateStatus.success,
      data: "value",
    });
  });
});
