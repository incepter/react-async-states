import AsyncState  from "async-state";
import { AsyncStateStatus, shallowClone } from "shared";
import { act } from "@testing-library/react-hooks";
import { timeout } from "./test-utils";
import { defaultASConfig } from "async-state/AsyncState";

jest.useFakeTimers();

describe('AsyncState - fork', () => {
  it('should simulate async state and check fork count', () => {
    // given
    let key = "simulated";
    let promise = timeout(100, [{ id: 1, description: "value" }]);
    let myConfig = {};

    // when
    let myAsyncState = new AsyncState(key, promise, myConfig);

    // then
    expect(myAsyncState.key).toBe(key);
    expect(myAsyncState.forkCount).toBe(0);
    expect(myAsyncState.__IS_FORK__).toBeFalsy();
    expect(myAsyncState.lastSuccess).toBe(undefined);
    expect(myAsyncState.subscriptions).toEqual({});
    expect(typeof myAsyncState.run).toBe("function");
    expect(myAsyncState.config).toEqual(shallowClone(defaultASConfig, myConfig));
    expect(myAsyncState.currentState).toEqual({ data: null, status: AsyncStateStatus.initial, args: null });

    let forkedAsyncState = myAsyncState.fork();
    expect(myAsyncState.forkCount).toBe(1);
    expect(forkedAsyncState.forkCount).toBe(0);
    expect(forkedAsyncState.__IS_FORK__).toBeTruthy();
    expect(forkedAsyncState.config).toEqual(myAsyncState.config);
    expect(forkedAsyncState.lastSuccess).toEqual(myAsyncState.lastSuccess);
    expect(forkedAsyncState.originalPromise).toBe(myAsyncState.originalPromise);


    expect(forkedAsyncState.key).not.toBe(myAsyncState.key);
    expect(forkedAsyncState.promise).not.toBe(myAsyncState.promise);
    expect(forkedAsyncState.currentState).not.toBe(myAsyncState.currentState);// not same reference even if retrieved
    expect(forkedAsyncState.subscriptions).not.toBe(myAsyncState.subscriptions);// not same reference even if retrieved
  });
  it('should fork and keep state and subscriptions after run', async () => {
    // given
    let key = "simulated";
    let promise = timeout(100, [{ id: 1, description: "value" }]);
    let myConfig = {};

    // when
    let myAsyncState = new AsyncState(key, promise, myConfig);
    myAsyncState.run();

    await act(async () => {
      await jest.advanceTimersByTime(100);
    });

    expect(myAsyncState.currentState.status).toBe(AsyncStateStatus.success); // make sure it resolved

    let forkedAsyncState = myAsyncState.fork({ keepSubscriptions: true, keepState: true });
    // then
    // make sure they are deeply equal, but not with same reference ;)
    expect(myAsyncState.lastSuccess).toEqual(forkedAsyncState.lastSuccess);
    expect(myAsyncState.lastSuccess).not.toBe(forkedAsyncState.lastSuccess);
    expect(myAsyncState.currentState).toEqual(forkedAsyncState.currentState);
    expect(myAsyncState.currentState).not.toBe(forkedAsyncState.currentState);
  });
  it('should fork and keep state and subscriptions before run', async () => {
    // given
    let key = "simulated";
    let promise = timeout(100, [{ id: 1, description: "value" }]);
    let myConfig = {};

    // when
    let myAsyncState = new AsyncState(key, promise, myConfig);

    let forkedAsyncState = myAsyncState.fork({ keepSubscriptions: true, keepState: true });

    forkedAsyncState.run();

    await act(async () => {
      await jest.advanceTimersByTime(100);
    });

    expect(forkedAsyncState.currentState.status).toBe(AsyncStateStatus.success); // make sure it resolved

    // then
    expect(myAsyncState.lastSuccess).not.toEqual(forkedAsyncState.lastSuccess);// forked async state moved independently
    expect(myAsyncState.currentState).not.toBe(forkedAsyncState.currentState);
  });
});
