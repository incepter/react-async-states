import { act } from "@testing-library/react-hooks";
import { rejectionTimeout, timeout } from "./test-utils";
import AsyncState from "../AsyncState";
import { ASYNC_STATUS } from "../../utils";

jest.useFakeTimers();

describe('AsyncState - run', () => {

  it('should run an async state successfully with no subscribers', async () => {
    // given
    let key = "simulated";
    let promise = timeout(100, [{ id: 1, description: "value" }]);
    let myConfig = {};

    // when
    let myAsyncState = new AsyncState(key, promise, myConfig);

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
      args: [{
        payload: null,
        aborted: false,
        executionArgs: [],
        previousState: undefined,
        onAbort: expect.any(Function),
      }],
      data: null,
      status: ASYNC_STATUS.loading,
    });
    await act(async () => {
      await jest.advanceTimersByTime(50);
    });
    // should be still in loading state while promise did not resolve yet
    expect(myAsyncState.currentState).toEqual({
      args: [{
        executionArgs: [],
        previousState: undefined,
        onAbort: expect.any(Function),
        aborted: false,
        payload: null
      }],
      data: null,
      status: ASYNC_STATUS.loading,
    });

    await act(async () => {
      await jest.advanceTimersByTime(50);
    });

    // async state should be in success state with data
    expect(myAsyncState.currentState).toEqual({
      args: [{
        executionArgs: [],
        previousState: undefined,
        onAbort: expect.any(Function),
        aborted: false,
        payload: null
      }],
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
    let myAsyncState = new AsyncState(key, promise, myConfig);

    // then
    myAsyncState.run();
    await act(async () => {
      await jest.advanceTimersByTime(50);
    });
    // async state should be in success state with data
    expect(myAsyncState.currentState).toEqual({
      args: [{
        executionArgs: [],
        previousState: undefined,
        onAbort: expect.any(Function),
        aborted: false,
        payload: null
      }],
      status: ASYNC_STATUS.error,
      data: "Some Error",
    });
  });
});
