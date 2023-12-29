import { AsyncState } from "../..";
import { timeout } from "./test-utils";
import { mockDateNow, TESTS_TS } from "../utils/setup";
import { pending } from "../../enums";
import { replaceInstanceState } from "../../modules/StateUpdate";

// @ts-ignore
jest.useFakeTimers("modern");
mockDateNow();

describe("AsyncState - setState", () => {
  // given
  let key = "simulated";
  let producer = timeout(100, [{ id: 1, description: "value" }]);
  let myConfig = { initialValue: null };
  jest.spyOn(Date, "now").mockImplementation(() => TESTS_TS);
  let myAsyncState = new AsyncState(key, producer, myConfig);
  let subscription = jest.fn();
  myAsyncState.actions.subscribe({ cb: subscription });

  beforeEach(() => {
    subscription.mockClear();
  });

  it("should synchronously mutate the state after setState call and notify subscribers", () => {
    // when
    let current = myAsyncState.state;
    if (current.status === pending) {
      current = current.prev;
    }
    replaceInstanceState(myAsyncState, {
      status: "pending",
      data: null,
      timestamp: Date.now(),
      prev: current,
      props: { args: [], payload: {} },
    });
    // then
    let expectedState = {
      props: { args: [], payload: {} },
      data: null,
      prev: {
        data: null,
        props: {
          args: [null],
          payload: {},
        },
        status: "initial",
        timestamp: TESTS_TS,
      },
      timestamp: TESTS_TS,
      status: "pending",
    };
    expect(myAsyncState.state).toEqual(expectedState);

    expect(subscription).toHaveBeenCalledTimes(1);
    expect(subscription).toHaveBeenCalledWith(expectedState);
  });
  it("should update state and do not notify subscribers", async () => {
    let lastSuccess = myAsyncState.lastSuccess;

    replaceInstanceState(
      myAsyncState,
      {
        status: "success",
        data: {},
        props: { args: [], payload: {} },
        timestamp: Date.now(),
      },
      false
    );
    // then
    expect(subscription).not.toHaveBeenCalled();
  });
});
