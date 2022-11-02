import { AsyncStateStatus } from "shared";
import AsyncState, { StateBuilder } from "../../async-state";
import { timeout } from "./test-utils";
import { mockDateNow, TESTS_TS } from "../react-async-state/utils/setup";

jest.useFakeTimers("modern");
mockDateNow();

describe('AsyncState - setState', () => {
  // given
  let key = "simulated";
  let producer = timeout(100, [{id: 1, description: "value"}]);
  let myConfig = {initialValue: null};
  let myAsyncState = new AsyncState(key, producer, myConfig);
  let subscription = jest.fn();
  myAsyncState.subscribe(subscription);

  beforeEach(() => {
    subscription.mockClear();
  });

  it('should synchronously mutate the state after setState call and notify subscribers', () => {
    // when
    myAsyncState.replaceState(StateBuilder.pending({}));
    // then
    let expectedState = {
      props: {},
      data: null,
      timestamp: TESTS_TS,
      status: AsyncStateStatus.pending,
    };
    expect(myAsyncState.state).toEqual(expectedState);

    expect(subscription).toHaveBeenCalledTimes(1);
    expect(subscription).toHaveBeenCalledWith(expectedState);
  });
  it('should update state and do not notify subscribers', async () => {
    let lastSuccess = myAsyncState.lastSuccess;

    myAsyncState.replaceState(StateBuilder.success({}), false);
    // then
    expect(subscription).not.toHaveBeenCalled();
  });
});
