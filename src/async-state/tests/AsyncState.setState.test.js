import { timeout } from "./test-utils";
import AsyncState from "../AsyncState";
import { AsyncStateStatus } from "../../shared";
import { AsyncStateStateBuilder } from "../StateBuilder";

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
    myAsyncState.setState(AsyncStateStateBuilder.loading({}));
    // then
    let expectedState = {
      args: {},
      data: null,
      status: AsyncStateStatus.loading,
    };
    expect(myAsyncState.currentState).toEqual(expectedState);

    expect(subscription).toHaveBeenCalledTimes(1);
    expect(subscription).toHaveBeenCalledWith(expectedState);
  });
  it('should update state with a function updater that checks on previous state', async () => {
    // given: updater
    let updater = jest.fn().mockImplementation((...args) => {
      expect(args[0]).toEqual(myAsyncState.currentState);
      return AsyncStateStateBuilder.success({}, {});
    });
    // when
    myAsyncState.setState(updater);
    // then
    expect(updater).toHaveBeenCalledTimes(1);
    expect(myAsyncState.currentState).toEqual({
      args: {},
      data: {},
      status: AsyncStateStatus.success,
    });

  });
  it('should update state and do not notify subscribers', async () => {
    let lastSuccess = myAsyncState.lastSuccess;

    myAsyncState.setState(AsyncStateStateBuilder.success({}), false);
    // then
    expect(subscription).not.toHaveBeenCalled();
  });
});
