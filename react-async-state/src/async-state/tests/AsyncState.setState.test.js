import { timeout } from "./test-utils";
import AsyncState from "../AsyncState";
import { ASYNC_STATUS } from "../../utils";
import { AsyncStateBuilder } from "../StateBuilder";

jest.useFakeTimers();

describe('AsyncState - setState', () => {
  // given
  let key = "simulated";
  let promise = timeout(100, [{ id: 1, description: "value" }]);
  let myConfig = {};
  let myAsyncState = new AsyncState(key, promise, myConfig);
  let subscription = jest.fn();
  myAsyncState.subscribe(subscription);

  beforeEach(() => {
    subscription.mockClear();
  });

  it('should synchronously mutate the state after setState call and notify subscribers', () => {
    // when
    myAsyncState.setState(AsyncStateBuilder.loading({}));
    // then
    let expectedState = {
      args: {},
      data: null,
      status: ASYNC_STATUS.loading,
    };
    expect(myAsyncState.currentState).toEqual(expectedState);

    expect(subscription).toHaveBeenCalledTimes(1);
    expect(subscription).toHaveBeenCalledWith(expectedState);
  });
  it('should update state with a function updater that checks on previous state', async () => {
    // given: updater
    let updater = jest.fn().mockImplementation((...args) => {
      expect(args[0]).toEqual(myAsyncState.currentState);
      return AsyncStateBuilder.success({}, {});
    });
    // when
    myAsyncState.setState(updater);
    // then
    expect(updater).toHaveBeenCalledTimes(1);
    expect(updater).toHaveBeenCalledWith(myAsyncState.previousState);
    expect(myAsyncState.currentState).toEqual({
      args: {},
      data: {},
      status: ASYNC_STATUS.success,
    });

  });
  it('should update state and do not update state nor notify subscribers', async () => {
    let previousState = myAsyncState.previousState;

    myAsyncState.setState(AsyncStateBuilder.success({}), false, false);
    // then
    expect(subscription).not.toHaveBeenCalled();
    expect(previousState).toEqual(myAsyncState.previousState);
  });
});
