import { AsyncState, Status } from "../..";
import { rejectionTimeout, timeout } from "./test-utils";
import { mockDateNow, TESTS_TS } from "../utils/setup";
import { flushPromises } from "../utils/test-utils";

// @ts-ignore
jest.useFakeTimers("modern");
mockDateNow();

describe("AsyncState - run", () => {
  it("should run an async state successfully with no subscribers", async () => {
    // given
    let key = "simulated-1";
    let producer = timeout(100, [{ id: 1, description: "value" }]);
    let myConfig = { initialValue: null };

    // when
    let myAsyncState = new AsyncState(key, producer, myConfig);

    // then
    // should have initial status
    expect(myAsyncState.state).toEqual({
      props: { args: [null], payload: {} },
      data: null,
      timestamp: TESTS_TS,
      status: "initial",
    });

    myAsyncState.actions.run();
    // should transition synchronously to pending state
    expect(myAsyncState.state).toEqual({
      props: {
        args: [],
        payload: {},
      },
      prev: {
        props: { args: [null], payload: {} },
        data: null,
        status: "initial",
        timestamp: 1487076708000,
      },
      data: null,
      timestamp: TESTS_TS,
      status: "pending",
    });

    await jest.advanceTimersByTime(50);
    // should be still in pending state while producer did not resolve yet
    expect(myAsyncState.state).toEqual({
      props: {
        args: [],
        payload: {},
      },
      prev: {
        data: null,
        props: {
          args: [null],
          payload: {},
        },
        status: "initial",
        timestamp: TESTS_TS,
      },
      data: null,
      timestamp: TESTS_TS,
      status: "pending",
    });

    await jest.advanceTimersByTime(50);
    // async state should be in success state with data
    expect(myAsyncState.state).toEqual({
      props: {
        args: [],
        payload: {},
      },
      timestamp: TESTS_TS,
      status: "success",
      data: [{ id: 1, description: "value" }],
    });
  });
  it("should run an async state with rejection with no subscribers", async () => {
    // given
    let key = "simulated-2";
    let producer = rejectionTimeout(50, "Some Error");
    let myConfig = { initialValue: null };

    // when
    let myAsyncState = new AsyncState(key, producer, myConfig);

    // then
    myAsyncState.actions.run();
    await jest.advanceTimersByTime(50);
    await flushPromises();
    // async state should be in success state with data
    expect(myAsyncState.state).toEqual({
      props: {
        args: [],
        payload: {},
      },
      timestamp: TESTS_TS,
      status: "error",
      data: "Some Error",
    });
  });
});
