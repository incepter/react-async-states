import { act } from "@testing-library/react-hooks";
import {
  AsyncState,
  standaloneProducerEffectsCreator,
  Status
} from "async-states-core";
import { rejectionTimeout, timeout } from "./test-utils";
import { mockDateNow, TESTS_TS } from "../react-async-state/utils/setup";

// @ts-ignore
jest.useFakeTimers("modern");
mockDateNow();

describe('AsyncState - run', () => {
  it('should run an async state successfully with no subscribers', async () => {
    // given
    let key = "simulated";
    let producer = timeout(100, [{id: 1, description: "value"}]);
    let myConfig = {initialValue: null};

    // when
    let myAsyncState = new AsyncState(key, producer, myConfig);

    // then
    // should have initial status
    expect(myAsyncState.state).toEqual({
      props: null,
      data: null,
      timestamp: TESTS_TS,
      status: Status.initial,
    });

    myAsyncState.run(standaloneProducerEffectsCreator);
    // should transition synchronously to pending state
    expect(myAsyncState.state).toEqual({
      props: {
        args: [],
        payload: {},
        lastSuccess: {
          data: null,
          timestamp: TESTS_TS,
          status: Status.initial,
        },
      },
      data: null,
      timestamp: TESTS_TS,
      status: Status.pending,
    });

    await act(async () => {
      await jest.advanceTimersByTime(50);
    });
    // should be still in pending state while producer did not resolve yet
    expect(myAsyncState.state).toEqual({
      props: {
        args: [],
        payload: {},
        lastSuccess: {
          data: null,
          timestamp: TESTS_TS,
          status: Status.initial,
        },
      },
      data: null,
      timestamp: TESTS_TS,
      status: Status.pending,
    });

    await act(async () => {
      await jest.advanceTimersByTime(50);
    });
    // async state should be in success state with data
    expect(myAsyncState.state).toEqual({
      props: {
        args: [],
        payload: {},
        lastSuccess: {
          data: null,
          timestamp: TESTS_TS,
          status: Status.initial,
        },
      },
      timestamp: TESTS_TS,
      status: Status.success,
      data: [{id: 1, description: "value"}],
    });
  });
  it('should run an async state with rejection with no subscribers', async () => {
    // given
    let key = "simulated";
    let producer = rejectionTimeout(50, "Some Error");
    let myConfig = {initialValue: null};

    // when
    let myAsyncState = new AsyncState(key, producer, myConfig);

    // then
    myAsyncState.run(standaloneProducerEffectsCreator);
    await act(async () => {
      await jest.advanceTimersByTime(50);
    });
    // async state should be in success state with data
    expect(myAsyncState.state).toEqual({
      props: {
        args: [],
        payload: {},
        lastSuccess: {
          data: null,
          timestamp: TESTS_TS,
          status: Status.initial,
        },
      },
      timestamp: TESTS_TS,
      status: Status.error,
      data: "Some Error",
    });
  });
});
