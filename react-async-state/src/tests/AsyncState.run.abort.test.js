import { act } from "@testing-library/react-hooks";
import { rejectionTimeout, timeout } from "./test-utils";
import AsyncState from "../async-state/AsyncState";
import { ASYNC_STATUS } from "../utils";

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
        cancelled: false,
        executionArgs: {},
        providerCtx: null,
        renderCtx: null
      }],
      data: null,
      status: ASYNC_STATUS.loading,
    });

    subscription.mockClear();
    abort("reason");

    expect(subscription).toHaveBeenCalledTimes(1);
    expect(subscription).toHaveBeenCalledWith({
      args: {
        cancelled: true,
        executionArgs: {},
        providerCtx: null,
        renderCtx: null
      },
      data: "reason",
      status: ASYNC_STATUS.aborted,
    });

    expect(myAsyncState.currentState).toEqual({
      args: {
        cancelled: true,
        executionArgs: {},
        providerCtx: null,
        renderCtx: null
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
        cancelled: true,
        executionArgs: {},
        providerCtx: null,
        renderCtx: null
      },
      status: ASYNC_STATUS.aborted,
      data: "reason",
    });
  });
});
