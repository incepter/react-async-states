import { act } from "@testing-library/react-hooks";
import { timeout } from "./test-utils";
import AsyncState from "../async-state/AsyncState";
import { ASYNC_STATUS } from "../utils";

jest.useFakeTimers();

describe('AsyncState', () => {
  it('should simulate async state and check fork count', () => {
    // given
    let key = "simulated";
    let promise = timeout(1000, [{ id: 1, description: "value" }]);
    let myConfig = {};

    // when
    let myAsyncState = new AsyncState({ key, promise, config: myConfig });

    // then
    expect(myAsyncState.key).toBe(key);
    expect(myAsyncState.forkCount).toBe(0);
    expect(myAsyncState.config).toBe(myConfig);
    expect(myAsyncState.oldState).toBe(undefined);
    expect(myAsyncState.subscriptions).toEqual({});
    expect(typeof myAsyncState.run).toBe("function");
    expect(myAsyncState.currentState).toEqual({ data: null, status: ASYNC_STATUS.initial, args: null });

    let forkedAsyncState = myAsyncState.fork();
    expect(myAsyncState.forkCount).toBe(1);
    expect(forkedAsyncState.forkCount).toBe(0);
    expect(forkedAsyncState.config).toBe(myAsyncState.config);
    expect(forkedAsyncState.oldState).toBe(myAsyncState.oldState); // undefined
    expect(forkedAsyncState.originalPromise).toBe(myAsyncState.originalPromise);


    expect(forkedAsyncState.key).not.toBe(myAsyncState.key);
    expect(forkedAsyncState.promise).not.toBe(myAsyncState.promise);
    expect(forkedAsyncState.currentState).not.toBe(myAsyncState.currentState);// not same reference even if retrieved
    expect(forkedAsyncState.subscriptions).not.toBe(myAsyncState.subscriptions);// not same reference even if retrieved
  });

  it('should run an async state', async () => {
    // given
    let key = "simulated";
    let promise = timeout(1000, [{ id: 1, description: "value" }]);
    let myConfig = {};

    // when
    let myAsyncState = new AsyncState({ key, promise, config: myConfig });

    myAsyncState.run();

    await act(() => {
      jest.advanceTimersByTime(1000);
    });


    expect(myAsyncState.currentState).toEqual({
      args: [],
      status: ASYNC_STATUS.success,
      data: [{ id: 1, description: "value" }],
    });
  });
});
