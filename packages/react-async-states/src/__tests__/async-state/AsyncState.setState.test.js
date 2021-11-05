import { AsyncStateStatus } from "shared";
import AsyncState, { AsyncStateStateBuilder } from "async-state";
import { timeout } from "./test-utils";

jest.useFakeTimers("modern");

describe('AsyncState - setState', () => {
  // given
  let key = "simulated";
  let producer = timeout(100, [{id: 1, description: "value"}]);
  let myConfig = {};
  let myAsyncState = new AsyncState(key, producer, myConfig);
  let subscription = jest.fn();
  myAsyncState.subscribe(subscription);

  beforeEach(() => {
    subscription.mockClear();
  });

  it('should synchronously mutate the state after setState call and notify subscribers', () => {
    // when
    myAsyncState.setState(AsyncStateStateBuilder.pending({}));
    // then
    let expectedState = {
      argv: {},
      data: null,
      status: AsyncStateStatus.pending,
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
      argv: {},
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
