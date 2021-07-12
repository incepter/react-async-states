import { act } from "@testing-library/react-hooks";
import { rejectionTimeout, timeout } from "./test-utils";
import AsyncState from "../AsyncState";
import { ASYNC_STATUS } from "../../utils";

jest.useFakeTimers();

describe('AsyncState - run - abort', () => {

  it('should abort while loading and check state did not update after supposed resolve', async () => {
    // given
    let key = "simulated";
    let promise = timeout(100, [{ id: 1, description: "value" }]);
    let myConfig = {};
    let subscription = jest.fn();

    // when
    let myAsyncState = new AsyncState({ key, promise, config: myConfig });
    myAsyncState.subscribe(subscription);
    // then
    // should have initial status
    expect(myAsyncState.currentState).toEqual({
      args: null,
      data: null,
      status: ASYNC_STATUS.initial,
    });

    const abort = myAsyncState.run();

    await act(async () => {
      await jest.advanceTimersByTime(50);
    });


    expect(subscription).toHaveBeenCalledTimes(1);
    expect(subscription).toHaveBeenCalledWith({
      args: [{
        aborted: false,
        executionArgs: {},
        payload: null
      }],
      data: null,
      status: ASYNC_STATUS.loading,
    });

    subscription.mockClear();
    abort("reason");

    expect(subscription).toHaveBeenCalledTimes(1);
    expect(subscription).toHaveBeenCalledWith({
      args: {
        aborted: true,
        executionArgs: {},
        payload: null
      },
      data: "reason",
      status: ASYNC_STATUS.aborted,
    });

    expect(myAsyncState.currentState).toEqual({
      args: {
        aborted: true,
        executionArgs: {},
        payload: null
      },
      data: "reason",
      status: ASYNC_STATUS.aborted,
    });

    await act(async () => {
      await jest.advanceTimersByTime(50);
    });

    // async state should be in success state with data
    expect(myAsyncState.currentState).toEqual({
      args: {
        aborted: true,
        executionArgs: {},
        payload: null
      },
      status: ASYNC_STATUS.aborted,
      data: "reason",
    });
  });

  it('should abort while loading and check state did not update after supposed rejection', async () => {
    // given
    let key = "simulated";
    let promise = rejectionTimeout(100, "reason");
    let myConfig = {};
    let subscription = jest.fn();

    // when
    let myAsyncState = new AsyncState({ key, promise, config: myConfig });
    myAsyncState.subscribe(subscription);
    // then

    const abort = myAsyncState.run();

    await act(async () => {
      await jest.advanceTimersByTime(50);
    });

    subscription.mockClear();
    abort("reason");
    expect(subscription.mock.calls[0][0].status).toBe(ASYNC_STATUS.aborted);

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
      args: {
        aborted: true,
        executionArgs: {},
        payload: null
      },
      status: ASYNC_STATUS.aborted,
      data: "reason",
    });
  });
  it('should automatically abort previous promise and start new one', async () => {
    // given
    let key = "simulated";
    let promise = timeout(100, "value");
    let myConfig = {};
    let subscription = jest.fn();

    // when
    let myAsyncState = new AsyncState({ key, promise, config: myConfig });

    myAsyncState.subscribe(subscription);
    // then

    myAsyncState.run();

    await act(async () => {
      await jest.advanceTimersByTime(50);
    });

    expect(myAsyncState.currentState.status).toBe(ASYNC_STATUS.loading);

    // rerun while loading should interrupt previous
    subscription.mockClear();
    myAsyncState.run();

    expect(subscription.mock.calls[0][0].status).toBe(ASYNC_STATUS.aborted);
    expect(subscription.mock.calls[1][0].status).toBe(ASYNC_STATUS.loading);

    expect(subscription).toHaveBeenCalledTimes(2);

    await act(async () => {
      await jest.advanceTimersByTime(100);
    });

    // async state should be in success state with data
    expect(myAsyncState.currentState).toEqual({
      args: [{
        aborted: false,
        executionArgs: {},
        payload: null,
        previousState: {
          args: [
            {
              aborted: true,
              executionArgs: {},
              payload: null
            }
          ],
          data: null,
          status: ASYNC_STATUS.loading,
        },
      }],
      status: ASYNC_STATUS.success,
      data: "value",
    });
  });
});
